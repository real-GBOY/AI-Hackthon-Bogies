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
from typing import Callable, TypeVar

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

REFUSAL_TEXT = "The provided guidelines do not cover this."

SYSTEM_PROMPT = f"""You are a clinical-guideline assistant for pregnancy hypertension and \
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


def build_context_block(chunks: list[dict]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, start=1):
        parts.append(f"[{i}] Source: {chunk['source']} p.{chunk['page']}\n{chunk['text']}")
    return "\n\n".join(parts)


def generate_answer(question: str, chunks: list[dict]) -> str:
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
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
        )
    )
    answer = response.choices[0].message.content
    # The model occasionally uses full-width brackets (CJK-style 【】) instead of
    # the required ASCII [filename p.X] format despite the system prompt — normalize
    # rather than keep relying on prompt compliance alone.
    return answer.replace("【", "[").replace("】", "]")


def main() -> None:
    if len(sys.argv) < 2:
        print('Usage: python generate.py "your question"', file=sys.stderr)
        sys.exit(1)

    question = sys.argv[1]
    chunks = retrieve(question, k=TOP_K)

    answer = generate_answer(question, chunks)

    print("Answer:")
    print(answer)
    print("\nRetrieved sources:")
    if not chunks:
        print("  (none)")
    for i, c in enumerate(chunks, start=1):
        print(f"  [{i}] {c['source']} p.{c['page']} (score={c['score']:.4f})")


if __name__ == "__main__":
    main()
