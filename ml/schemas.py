"""
Disease-agnostic response/request schemas for the clinical risk API.

These are the contract between the ML service and any frontend or downstream
consumer. Field names are deliberately generic (no disease-specific terms) so
the same shapes keep working once a real dataset and model are plugged in.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class RiskCategory(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


class TrajectoryDirection(str, Enum):
    RISING = "rising"
    STABLE = "stable"
    FALLING = "falling"


class TrajectoryPoint(BaseModel):
    """One point in a patient's risk history. `time` is a generic assessment
    label (e.g. "assessment_3") or ISO timestamp — never a disease-specific
    visit type."""

    time: str
    risk: float = Field(ge=0.0, le=1.0)


class Driver(BaseModel):
    """One explainable factor behind a risk score. `feature` is whatever
    column name the eventual dataset uses."""

    feature: str
    impact: float


class Uncertainty(BaseModel):
    flag: bool
    reason: str | None = None


class DriverDetail(BaseModel):
    """Extended driver info for models that can cite a source for each
    factor (e.g. a guideline-grounded rule engine). Optional — a model that
    can't provide this (like a future trained model without built-in
    citations) simply leaves RiskResult.driver_details unset."""

    feature: str
    impact: float
    description: str
    source: str


class RiskResult(BaseModel):
    """The full risk-assessment payload returned by /predict and
    /patients/{id}/trajectory."""

    patient_id: str | None = None
    risk_score: float = Field(ge=0.0, le=1.0)
    risk_category: RiskCategory
    trajectory: list[TrajectoryPoint]
    trajectory_direction: TrajectoryDirection
    drivers: list[Driver]
    driver_details: list[DriverDetail] | None = None
    uncertainty: Uncertainty
    confidence: float = Field(ge=0.0, le=1.0)
    assessment_time: datetime


class PredictRequest(BaseModel):
    features: dict[str, Any] = Field(default_factory=dict)
    patient_id: str | None = None


class Tone(str, Enum):
    CURRENT = "current"
    WATCH = "watch"
    NEUTRAL = "neutral"
    STABLE = "stable"


class TodaysTask(BaseModel):
    title: str
    detail: str


class NextAppointment(BaseModel):
    when: str
    detail: str


class PatientAppContent(BaseModel):
    """Content backing the mobile patient app's home/ask screens."""

    first_name: str
    full_name: str
    initials: str
    week: int
    due_date: str
    status_label: str
    todays_task: TodaysTask
    next_appointment: NextAppointment
    suggested_questions: list[str]


class TimelineEvent(BaseModel):
    title: str
    detail: str
    tone: Tone


class CarePlanAppointment(BaseModel):
    when: str
    detail: str


class CarePlanMonitoringItem(BaseModel):
    label: str
    cadence: str
    tone: Tone


class CarePlan(BaseModel):
    appointments: list[CarePlanAppointment]
    monitoring: list[CarePlanMonitoringItem]
    to_discuss: list[str]


class IntakeFollowupQA(BaseModel):
    question: str
    answer: str


class ContentCitation(BaseModel):
    source: str
    page: int


class RetrievedPassage(ContentCitation):
    score: float


class CapturedQA(BaseModel):
    """A pre-captured RAG answer for demo reliability — see rag_routes.py's
    /rag/query for the live equivalent this mirrors the shape of."""

    question: str
    answer: str
    citations: list[ContentCitation]
    retrieved: list[RetrievedPassage]


class PatientProfile(BaseModel):
    """Non-scoring content for a patient — everything RiskResult doesn't
    cover. Sections are optional: a patient may have no authored narrative
    content beyond name/age (see patient_store.PATIENT_CONTENT's demo-2)."""

    patient_id: str
    name: str
    age: int
    app_content: PatientAppContent | None = None
    timeline: list[TimelineEvent] | None = None
    care_plan: CarePlan | None = None
    intake_followup: list[IntakeFollowupQA] | None = None
    captured_qa: CapturedQA | None = None


class LearnArticleSummary(BaseModel):
    slug: str
    title: str
    meta: str
    tone: Tone
    featured: bool


class LearnArticleDetail(LearnArticleSummary):
    detail: str | None = None


class ClinicianOut(BaseModel):
    name: str
    role: str
    panel: str


class AssessmentOut(BaseModel):
    assessment_id: str
    assessment_time: str
    features: dict[str, Any]
