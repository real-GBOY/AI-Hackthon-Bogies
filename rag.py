"""
Ingestion + retrieval for the preeclampsia/hypertension clinical-guideline RAG.

Knowledge base: RESEARCH/09_Clinical_Guidelines/*.pdf ONLY. Never RESEARCH/'s
other folders — those are reading material for the team, not RAG source.

Usage:
    python rag.py build              # ingest PDFs -> FAISS index + chunk metadata
    python rag.py query "..."        # retrieve top-5 chunks for a question
"""

from __future__ import annotations

import pickle
import sys
from pathlib import Path
from typing import Any

import faiss
import numpy as np
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

PROJECT_ROOT = Path(__file__).resolve().parent
GUIDELINES_DIR = PROJECT_ROOT / "RESEARCH" / "09_Clinical_Guidelines"
INDEX_PATH = PROJECT_ROOT / "guidelines.faiss"
CHUNKS_PATH = PROJECT_ROOT / "guidelines_chunks.pkl"

EMBED_MODEL_NAME = "BAAI/bge-small-en-v1.5"
# bge models require this instruction prefix on QUERIES only, not on passages.
QUERY_INSTRUCTION = "Represent this sentence for searching relevant passages: "

CHUNK_SIZE = 900
CHUNK_OVERLAP = 150

_embedder: SentenceTransformer | None = None


def get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer(EMBED_MODEL_NAME)
    return _embedder


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Sliding-window character chunking over one page's text."""
    text = " ".join(text.split())  # collapse whitespace/newlines
    if not text:
        return []
    chunks = []
    start = 0
    step = chunk_size - overlap
    while start < len(text):
        chunk = text[start : start + chunk_size].strip()
        if chunk:
            chunks.append(chunk)
        start += step
    return chunks


def load_guideline_pdfs() -> list[Path]:
    return sorted(GUIDELINES_DIR.glob("*.pdf"))


def build() -> None:
    pdf_paths = load_guideline_pdfs()
    if not pdf_paths:
        print(
            f"No PDFs found in {GUIDELINES_DIR}\n"
            "Add the guideline PDFs there first (e.g. ACOG/WHO/NICE) — "
            "this script does not invent or download documents.",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"Found {len(pdf_paths)} PDF(s) in {GUIDELINES_DIR}:")
    for p in pdf_paths:
        print(f"  - {p.name}")

    records: list[dict[str, Any]] = []
    for pdf_path in pdf_paths:
        reader = PdfReader(str(pdf_path))
        for page_num, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text() or ""
            for chunk in chunk_text(page_text):
                records.append({"text": chunk, "source": pdf_path.name, "page": page_num})

    if not records:
        print("No extractable text found in any PDF — check that they aren't scanned images.", file=sys.stderr)
        sys.exit(1)

    print(f"Extracted {len(records)} chunks from {len(pdf_paths)} PDF(s). Embedding with {EMBED_MODEL_NAME} ...")

    embedder = get_embedder()
    texts = [r["text"] for r in records]
    embeddings = embedder.encode(
        texts,
        batch_size=32,
        show_progress_bar=True,
        normalize_embeddings=True,
        convert_to_numpy=True,
    ).astype("float32")

    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    faiss.write_index(index, str(INDEX_PATH))
    with open(CHUNKS_PATH, "wb") as f:
        pickle.dump(records, f)

    print(f"Saved index -> {INDEX_PATH} ({index.ntotal} vectors, dim={dim})")
    print(f"Saved chunk metadata -> {CHUNKS_PATH} ({len(records)} records)")


def _load_index_and_chunks() -> tuple[faiss.Index, list[dict[str, Any]]]:
    if not INDEX_PATH.exists() or not CHUNKS_PATH.exists():
        print(
            f"Index not found. Run `python rag.py build` first "
            f"(expected {INDEX_PATH.name} and {CHUNKS_PATH.name} in {PROJECT_ROOT}).",
            file=sys.stderr,
        )
        sys.exit(1)
    index = faiss.read_index(str(INDEX_PATH))
    with open(CHUNKS_PATH, "rb") as f:
        chunks = pickle.load(f)
    return index, chunks


def retrieve(query: str, k: int = 5) -> list[dict[str, Any]]:
    """Return the top-k chunks for `query`, each with text/source/page/score."""
    index, chunks = _load_index_and_chunks()
    embedder = get_embedder()

    query_vec = embedder.encode(
        [QUERY_INSTRUCTION + query],
        normalize_embeddings=True,
        convert_to_numpy=True,
    ).astype("float32")

    scores, indices = index.search(query_vec, k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx == -1:
            continue
        chunk = chunks[idx]
        results.append(
            {
                "text": chunk["text"],
                "source": chunk["source"],
                "page": chunk["page"],
                "score": float(score),
            }
        )
    return results


def query(question: str, k: int = 5) -> None:
    results = retrieve(question, k=k)
    print(f'Top {len(results)} results for: "{question}"\n')
    for i, r in enumerate(results, start=1):
        print(f"[{i}] score={r['score']:.4f}  source={r['source']}  page={r['page']}")
        print(f"    {r['text'][:300]}{'...' if len(r['text']) > 300 else ''}\n")


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in {"build", "query"}:
        print('Usage:\n  python rag.py build\n  python rag.py query "your question"', file=sys.stderr)
        sys.exit(1)

    command = sys.argv[1]
    if command == "build":
        build()
    elif command == "query":
        if len(sys.argv) < 3:
            print('Usage: python rag.py query "your question"', file=sys.stderr)
            sys.exit(1)
        query(sys.argv[2])


if __name__ == "__main__":
    main()
