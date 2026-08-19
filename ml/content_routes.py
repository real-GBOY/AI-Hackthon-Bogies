"""
Non-scoring patient content: app profile, timeline, care plan, learn
articles, and the clinician identity shown in the dashboard's Settings view.

Kept separate from app.py's /predict and /patients/{id}/trajectory routes
(which are about risk scoring) the same way rag_routes.py is kept separate
for the RAG pipeline — one file per concern rather than one growing app.py.

Router creation is a factory (create_content_router) rather than a bare
module-level `router`, because these routes need the same `_patient_store`
instance app.py already selected via PATIENT_STORE (see app.py's
_select_patient_store()) — passing it in avoids a circular import between
this module and app.py.
"""

from __future__ import annotations

from typing import Protocol

from fastapi import APIRouter, HTTPException

from schemas import (
    AssessmentOut,
    ClinicianOut,
    LearnArticleDetail,
    LearnArticleSummary,
    PatientProfile,
)


class PatientStore(Protocol):
    """Structural type covering the subset of InMemoryPatientStore /
    PostgresPatientStore this router calls — same "either store, same
    interface" contract patient_store.py and db.py already document."""

    def get_assessments(self, patient_id: str) -> list[dict] | None: ...
    def get_content(self, patient_id: str) -> dict | None: ...
    def list_learn_articles(self) -> list[dict]: ...
    def get_learn_article(self, slug: str) -> dict | None: ...
    def get_clinician(self) -> dict[str, str]: ...


def create_content_router(patient_store: PatientStore) -> APIRouter:
    router = APIRouter()

    @router.get("/patients/{patient_id}/profile", response_model=PatientProfile)
    def get_profile(patient_id: str) -> PatientProfile:
        content = patient_store.get_content(patient_id)
        if content is None:
            raise HTTPException(status_code=404, detail=f"Unknown patient_id: {patient_id!r}")
        return PatientProfile(patient_id=patient_id, **content)

    @router.get("/patients/{patient_id}/assessments", response_model=list[AssessmentOut])
    def get_assessments(patient_id: str) -> list[AssessmentOut]:
        assessments = patient_store.get_assessments(patient_id)
        if assessments is None:
            raise HTTPException(status_code=404, detail=f"Unknown patient_id: {patient_id!r}")
        return [
            AssessmentOut(
                assessment_id=a["assessment_id"],
                assessment_time=a["assessment_time"],
                features=a["features"],
            )
            for a in assessments
        ]

    @router.get("/learn", response_model=list[LearnArticleSummary])
    def list_learn_articles() -> list[LearnArticleSummary]:
        return [LearnArticleSummary(**a) for a in patient_store.list_learn_articles()]

    @router.get("/learn/{slug}", response_model=LearnArticleDetail)
    def get_learn_article(slug: str) -> LearnArticleDetail:
        article = patient_store.get_learn_article(slug)
        if article is None:
            raise HTTPException(status_code=404, detail=f"Unknown article slug: {slug!r}")
        return LearnArticleDetail(**article)

    @router.get("/clinician/me", response_model=ClinicianOut)
    def get_clinician() -> ClinicianOut:
        return ClinicianOut(**patient_store.get_clinician())

    return router
