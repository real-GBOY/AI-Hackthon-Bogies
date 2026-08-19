"""
Grounded generation for the preeclampsia/hypertension clinical-guideline RAG.

Retrieval logic lives in rag.py — this file only imports retrieve() and
handles prompting/generation. Does not duplicate or alter rag.py's behavior.

Usage:
    python generate.py "your question"
"""

from __future__ import annotations

import os
import re
import sys
import time
from typing import Callable, Literal, TypeVar

from dotenv import load_dotenv
from groq import Groq

from rag import retrieve

T = TypeVar("T")
_RETRY_WAIT_PATTERN = re.compile(r"try again in ([\d.]+)(ms|s)")


def call_with_retry(fn: Callable[[], T], max_retries: int = 6) -> T:
    """Retry a Groq call on rate-limit (429) errors, honoring the API's
    suggested wait time when it gives one. Free-tier TPM limits are low
    enough that this fires routinely during eval.py's ~30-question runs."""
    for attempt in range(max_retries):
        try:
            return fn()
        except Exception as exc:
            msg = str(exc)
            if "429" not in msg and "rate_limit" not in msg.lower():
                raise
            if attempt == max_retries - 1:
                raise
            match = _RETRY_WAIT_PATTERN.search(msg)
            if match:
                value, unit = match.groups()
                wait = (float(value) / 1000 if unit == "ms" else float(value)) + 1.0
            else:
                wait = 5.0 * (2**attempt)
            print(f"  (rate limited, retrying in {wait:.1f}s...)", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError("unreachable")  # pragma: no cover

load_dotenv()  # picks up GROQ_API_KEY from a project-root .env file, if present

MODEL_NAME = "openai/gpt-oss-120b"
TEMPERATURE = 0
TOP_K = 5

Mode = Literal["clinician", "patient"]

REFUSAL_TEXT = "The provided guidelines do not cover this."
REFUSAL_TEXT_PATIENT = (
    "I don't have enough guideline information to answer that — please ask your healthcare provider."
)

SYSTEM_PROMPT_CLINICIAN = f"""You are a clinical-guideline assistant for pregnancy hypertension and \
preeclampsia. You answer ONLY using the numbered context passages provided in the user \
message. Follow these rules exactly:

1. Answer strictly and only from the provided context passages. Never use outside knowledge, \
training data, or general medical knowledge that is not present in the context.
2. After each claim you make, cite the source it came from using the literal source filename \
and page number given with that passage, in EXACTLY this format: [filename p.X] — square \
brackets, the real filename as shown in the context (not the passage number), a space, "p.", \
then the page number. For example, if context passage [2] is "Source: acog_222.pdf p.7", cite \
it as [acog_222.pdf p.7]. Do NOT use any other citation style (no numbered footnote markers, \
no bare numbers, no special bracket characters).
3. If the context passages do not contain the answer to the question, reply with EXACTLY this \
sentence and nothing else: "{REFUSAL_TEXT}"
4. Do not guess, speculate, or fill gaps with general medical knowledge. If in doubt, refuse.
"""

SYSTEM_PROMPT_PATIENT = f"""You are a patient-education assistant for pregnant patients, answering \
questions about pregnancy hypertension and preeclampsia. You answer ONLY using the numbered context \
passages provided in the user message. Follow these rules exactly:

1. Answer strictly and only from the provided context passages. Never use outside knowledge, \
training data, or general medical knowledge that is not present in the context.
2. Write in plain, simple language a non-medical person can understand. Avoid jargon; if a clinical \
term is unavoidable, briefly explain it in the same sentence.
3. NEVER tell the patient they have, or do not have, a condition, and never give a diagnosis. Never \
tell them what medication or dose to take, or to change a dose. If the context describes a symptom, \
measurement, or risk factor the patient asked about, phrase it as something that "may be associated \
with" a condition or "is one of the things your healthcare provider looks at" — not as a diagnosis. \
For example, do NOT say "You have preeclampsia." Instead say something like: "The information you \
described may be associated with increased risk, but only a qualified healthcare professional can \
determine whether you have preeclampsia."
4. After each claim you make, cite the source it came from using the literal source filename and \
page number given with that passage, in EXACTLY this format: [filename p.X] — square brackets, the \
real filename as shown in the context (NOT the bracketed passage number like [1] or [2]), a space, \
"p.", then the page number. For example, if context passage [2] is "Source: acog_222.pdf p.7", cite \
it as [acog_222.pdf p.7], never as [2 p.7] or [2]. Do NOT use any other citation style. Always \
include at least one such citation for factual claims, even though the on-screen presentation may \
compress it later.
5. If the context passages do not contain the answer to the question, reply with EXACTLY this \
sentence and nothing else: "{REFUSAL_TEXT_PATIENT}"
6. Do not guess, speculate, or fill gaps with general medical knowledge. If in doubt, refuse.
7. If the question describes what sounds like an urgent or concerning symptom, gently encourage the \
patient to contact their healthcare provider rather than relying solely on this answer.
"""

SYSTEM_PROMPTS: dict[Mode, str] = {
    "clinician": SYSTEM_PROMPT_CLINICIAN,
    "patient": SYSTEM_PROMPT_PATIENT,
}
REFUSAL_TEXTS: dict[Mode, str] = {
    "clinician": REFUSAL_TEXT,
    "patient": REFUSAL_TEXT_PATIENT,
}

# --- Patient-mode safety guardrails -----------------------------------------
# A second, independent line of defense (projectOVW.md safety principle 2/6):
# prompt compliance alone isn't a safety guarantee, so these checks run on
# the model's actual output/input rather than trusting the prompt rules to
# always hold.

DIAGNOSTIC_SAFETY_FALLBACK = (
    "The information you described may be associated with increased risk, but only a "
    "qualified healthcare professional can determine whether you have this condition."
)

# Catches the LLM stating a diagnosis outright despite rule 3, e.g.
# "you have preeclampsia" / "you've been diagnosed with gestational hypertension".
_DIAGNOSTIC_CLAIM_PATTERN = re.compile(
    r"\byou(?:'ve| have)\s+(?:been\s+)?(?:diagnosed with\s+)?"
    r"(preeclampsia|eclampsia|gestational hypertension|hellp syndrome|chronic hypertension)\b",
    re.IGNORECASE,
)


def contains_diagnostic_claim(answer: str) -> bool:
    return bool(_DIAGNOSTIC_CLAIM_PATTERN.search(answer))


ESCALATION_LINE = "This information may require prompt discussion with your healthcare provider."

# Acute-symptom language pulled from the same ACOG "severe features" / NICE
# severe-symptom list that ml/models/ruleset.py's SEVERE_SYMPTOMS weights
# are grounded in, so the risk engine and the escalation check agree on what
# counts as urgent.
_ESCALATION_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"severe headache",
        r"blurr(?:ed|y) vision|visual disturbance|seeing (?:spots|flashing)|flashing lights|vision (?:loss|changes)",
        r"epigastric pain|pain (?:just )?below (?:the |my |her )?ribs|upper abdominal pain",
        r"swelling (?:of|in) (?:my |the )?(?:face|hands)|sudden swelling",
        r"decreased fetal movement|baby(?:'s)? movement (?:has )?(?:decreased|stopped)|baby (?:not moving|isn't moving)",
        r"seizure|convulsion",
    ]
]


def detect_escalation_signal(question: str) -> bool:
    """True if the QUESTION itself describes an acute/concerning symptom."""
    return any(p.search(question) for p in _ESCALATION_PATTERNS)


def build_context_block(chunks: list[dict]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, start=1):
        parts.append(f"[{i}] Source: {chunk['source']} p.{chunk['page']}\n{chunk['text']}")
    return "\n\n".join(parts)


def generate_answer(question: str, chunks: list[dict], mode: Mode = "clinician") -> str:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("GROQ_API_KEY is not set. Set it in your environment before running generate.py.", file=sys.stderr)
        sys.exit(1)

    client = Groq(api_key=api_key, timeout=30.0)
    context_block = build_context_block(chunks)

    user_message = f"Context passages:\n\n{context_block}\n\nQuestion: {question}"

    response = call_with_retry(
        lambda: client.chat.completions.create(
            model=MODEL_NAME,
            temperature=TEMPERATURE,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPTS[mode]},
                {"role": "user", "content": user_message},
            ],
        )
    )
    answer = response.choices[0].message.content
    # The model occasionally uses full-width brackets (CJK-style 【】) instead of
    # the required ASCII [filename p.X] format despite the system prompt — normalize
    # rather than keep relying on prompt compliance alone.
    answer = answer.replace("【", "[").replace("】", "]")

    if mode == "patient":
        is_refusal = answer.strip() == REFUSAL_TEXT_PATIENT
        if not is_refusal and contains_diagnostic_claim(answer):
            answer = DIAGNOSTIC_SAFETY_FALLBACK
        if not is_refusal and detect_escalation_signal(question):
            answer = f"{ESCALATION_LINE}\n\n{answer}"

    return answer


def main() -> None:
    if len(sys.argv) < 2:
        print('Usage: python generate.py "your question" [clinician|patient]', file=sys.stderr)
        sys.exit(1)

    question = sys.argv[1]
    mode: Mode = "clinician"
    if len(sys.argv) >= 3:
        if sys.argv[2] not in SYSTEM_PROMPTS:
            print(f"Unknown mode {sys.argv[2]!r}. Expected 'clinician' or 'patient'.", file=sys.stderr)
            sys.exit(1)
        mode = sys.argv[2]  # type: ignore[assignment]

    chunks = retrieve(question, k=TOP_K)

    answer = generate_answer(question, chunks, mode=mode)

    print("Answer:")
    print(answer)
    print("\nRetrieved sources:")
    if not chunks:
        print("  (none)")
    for i, c in enumerate(chunks, start=1):
        print(f"  [{i}] {c['source']} p.{c['page']} (score={c['score']:.4f})")


if __name__ == "__main__":
    main()
