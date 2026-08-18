"""
Phase 3 — eval harness for the preeclampsia/hypertension guideline RAG.

Runs every question in eval_questions.json through the real retrieve() +
generate_answer() pipeline (imported, not duplicated) and reports:

  - retrieval hit-rate@5 (document-level and exact-page-level)
  - citation accuracy (does the answer cite a correct source document?)
  - faithfulness (LLM-as-judge: does the answer stay inside the context?)
  - refusal accuracy (out-of-scope questions correctly refused)
  - false-refusal rate (in-scope questions incorrectly refused)

Usage:
    python eval.py
"""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from groq import Groq

from generate import MODEL_NAME, REFUSAL_TEXT, call_with_retry, generate_answer
from rag import retrieve

load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parent
QUESTIONS_PATH = PROJECT_ROOT / "eval_questions.json"
RESULTS_PATH = PROJECT_ROOT / "eval_results.json"

TOP_K = 5

# Must match rag.py's stored `source` values exactly.
SOURCE_ALIASES = {
    "ACOG-222": "Gestational_Hypertension_and_Preeclampsia_ACOG_Practice_Bulletin,_Number_222_1605448006.pdf",
    "WHO": "2011c-who_pe_final_1584190059.pdf",
    "NICE-NG133": "hypertension-in-pregnancy-diagnosis-and-management-pdf-66141717671365.pdf",
}
FILENAME_TO_LABEL = {v: k for k, v in SOURCE_ALIASES.items()}

CITATION_PATTERN = re.compile(r"\[([^\[\]]+?)\s+p\.(\d+)\]")

JUDGE_SYSTEM_PROMPT = """You are a strict faithfulness judge for a medical RAG system. You will be given \
CONTEXT passages and an ANSWER. Decide whether every factual claim in the ANSWER is directly supported by \
the CONTEXT, with no outside/invented information. Reply with exactly one word: YES if fully supported, or \
NO if the answer contains any claim not supported by the context."""


def load_questions() -> list[dict[str, Any]]:
    with open(QUESTIONS_PATH, encoding="utf-8") as f:
        return json.load(f)


def extract_cited_labels(answer: str) -> set[str]:
    labels = set()
    for filename, _page in CITATION_PATTERN.findall(answer):
        label = FILENAME_TO_LABEL.get(filename.strip())
        if label:
            labels.add(label)
    return labels


def judge_faithfulness(client: Groq, question: str, chunks: list[dict], answer: str) -> bool | None:
    context_block = "\n\n".join(f"[{i}] {c['source']} p.{c['page']}\n{c['text']}" for i, c in enumerate(chunks, 1))
    try:
        response = call_with_retry(
            lambda: client.chat.completions.create(
                model=MODEL_NAME,
                temperature=0,
                messages=[
                    {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": f"CONTEXT:\n{context_block}\n\nQUESTION: {question}\n\nANSWER: {answer}\n\nVerdict (YES/NO):",
                    },
                ],
            )
        )
        verdict = (response.choices[0].message.content or "").strip().upper()
        if verdict.startswith("YES"):
            return True
        if verdict.startswith("NO"):
            return False
        return None
    except Exception as exc:
        print(f"  ! faithfulness judge call failed: {exc}", file=sys.stderr)
        return None


def run() -> None:
    questions = load_questions()
    client = Groq(timeout=30.0)

    results = []
    for q in questions:
        print(f"[{q['id']:>2}] ({q['type']}) {q['question']}")
        time.sleep(1.5)  # basic pacing against Groq's tokens-per-minute rate limit
        chunks = retrieve(q["question"], k=TOP_K)
        try:
            answer = generate_answer(q["question"], chunks)
        except Exception as exc:
            print(f"  ! generate_answer failed: {exc}", file=sys.stderr)
            results.append(
                {
                    "id": q["id"],
                    "question": q["question"],
                    "type": q["type"],
                    "error": str(exc),
                    "retrieved": [{"source": c["source"], "page": c["page"], "score": c["score"]} for c in chunks],
                }
            )
            continue
        is_refusal_answer = answer.strip() == REFUSAL_TEXT

        record: dict[str, Any] = {
            "id": q["id"],
            "question": q["question"],
            "type": q["type"],
            "answer": answer,
            "retrieved": [{"source": c["source"], "page": c["page"], "score": c["score"]} for c in chunks],
        }

        if q["type"] == "in-scope":
            expected = q["expected_sources"]
            expected_docs = {e["source"] for e in expected}
            expected_pages = {(e["source"], e["page"]) for e in expected}

            retrieved_docs = {FILENAME_TO_LABEL.get(c["source"]) for c in chunks}
            retrieved_pages = {(FILENAME_TO_LABEL.get(c["source"]), c["page"]) for c in chunks}

            hit_doc = bool(expected_docs & retrieved_docs)
            hit_page = bool(expected_pages & retrieved_pages)

            cited_labels = extract_cited_labels(answer)
            citation_correct = bool(cited_labels & expected_docs) if not is_refusal_answer else False

            faithful = None if is_refusal_answer else judge_faithfulness(client, q["question"], chunks, answer)

            record.update(
                {
                    "hit_doc@5": hit_doc,
                    "hit_page@5": hit_page,
                    "cited_labels": sorted(cited_labels),
                    "citation_correct": citation_correct,
                    "faithful": faithful,
                    "false_refusal": is_refusal_answer,
                }
            )
            status = "OK" if (hit_doc and citation_correct and faithful and not is_refusal_answer) else "CHECK"
            print(f"      hit_doc={hit_doc} hit_page={hit_page} cited_ok={citation_correct} faithful={faithful} -> {status}")
        else:
            record["refused_correctly"] = is_refusal_answer
            print(f"      refused_correctly={is_refusal_answer}")

        results.append(record)

    summary = summarize(results)
    with open(RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump({"results": results, "summary": summary}, f, indent=2)

    print_summary(summary)
    print(f"\nFull results saved -> {RESULTS_PATH}")


def summarize(results: list[dict[str, Any]]) -> dict[str, Any]:
    ok_results = [r for r in results if "error" not in r]
    n_errors = len(results) - len(ok_results)
    in_scope = [r for r in ok_results if r["type"] == "in-scope"]
    refusal = [r for r in ok_results if r["type"] == "refusal"]

    def pct(items: list, key) -> float:
        vals = [1 for r in items if key(r)]
        return round(100 * len(vals) / len(items), 1) if items else 0.0

    faithful_judged = [r for r in in_scope if r.get("faithful") is not None]

    return {
        "n_in_scope": len(in_scope),
        "n_refusal": len(refusal),
        "n_errors": n_errors,
        "retrieval_hit_rate_doc@5": pct(in_scope, lambda r: r["hit_doc@5"]),
        "retrieval_hit_rate_page@5": pct(in_scope, lambda r: r["hit_page@5"]),
        "citation_accuracy": pct(in_scope, lambda r: r["citation_correct"]),
        "faithfulness": pct(faithful_judged, lambda r: r["faithful"]) if faithful_judged else None,
        "false_refusal_rate": pct(in_scope, lambda r: r["false_refusal"]),
        "refusal_accuracy": pct(refusal, lambda r: r["refused_correctly"]),
    }


def print_summary(summary: dict[str, Any]) -> None:
    print("\n" + "=" * 60)
    print("EVAL SUMMARY")
    print("=" * 60)
    print(f"In-scope questions:          {summary['n_in_scope']}")
    if summary["n_errors"]:
        print(f"Errored (excluded above):    {summary['n_errors']}")
    print(f"Refusal questions:           {summary['n_refusal']}")
    print(f"Retrieval hit-rate@5 (doc):  {summary['retrieval_hit_rate_doc@5']}%")
    print(f"Retrieval hit-rate@5 (page): {summary['retrieval_hit_rate_page@5']}%")
    print(f"Citation accuracy:           {summary['citation_accuracy']}%")
    print(f"Faithfulness (LLM-judge):    {summary['faithfulness']}%")
    print(f"False-refusal rate:          {summary['false_refusal_rate']}% (lower is better)")
    print(f"Refusal accuracy:            {summary['refusal_accuracy']}%")


if __name__ == "__main__":
    run()
