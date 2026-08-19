"""
Unified backend surface for the guideline RAG pipeline.

rag.py / generate.py live at the project root and were, until now, CLI-only
— there was no way for a frontend to call the RAG pipeline live. This module
imports them directly (adds the project root to sys.path below) and exposes
one FastAPI route, mounted onto the same app as /predict in app.py, so a
single backend serves both risk scoring and grounded Q&A.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from generate import (  # noqa: E402
    DIAGNOSTIC_SAFETY_FALLBACK,
    REFUSAL_TEXTS,
    detect_escalation_signal,
    generate_answer,
)
from rag import retrieve  # noqa: E402

router = APIRouter()

RagMode = Literal["clinician", "patient"]
TOP_K = 5


class RagQueryRequest(BaseModel):
    question: str
    mode: RagMode = "clinician"


class Citation(BaseModel):
    source: str
    page: int
    score: float


class RagQueryResponse(BaseModel):
    answer: str
    mode: RagMode
    refused: bool
    citations: list[Citation]
    escalation_flag: bool
    safety_override_applied: bool


@router.post("/rag/query", response_model=RagQueryResponse)
def rag_query(request: RagQueryRequest) -> RagQueryResponse:
    chunks = retrieve(request.question, k=TOP_K)
    answer = generate_answer(request.question, chunks, mode=request.mode)
    refused = answer.strip() == REFUSAL_TEXTS[request.mode]

    # Both flags are only meaningful in patient mode — the safety guardrails
    # in generate.py only run for mode="patient" (see generate_answer()).
    escalation_flag = request.mode == "patient" and not refused and detect_escalation_signal(request.question)
    safety_override_applied = request.mode == "patient" and DIAGNOSTIC_SAFETY_FALLBACK in answer

    return RagQueryResponse(
        answer=answer,
        mode=request.mode,
        refused=refused,
        citations=[Citation(source=c["source"], page=c["page"], score=c["score"]) for c in chunks],
        escalation_flag=escalation_flag,
        safety_override_applied=safety_override_applied,
    )
