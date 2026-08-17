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


class RiskResult(BaseModel):
    """The full risk-assessment payload returned by /predict."""

    risk_score: float = Field(ge=0.0, le=1.0)
    risk_category: RiskCategory
    trajectory: list[TrajectoryPoint]
    trajectory_direction: TrajectoryDirection
    drivers: list[Driver]
    uncertainty: Uncertainty
    confidence: float = Field(ge=0.0, le=1.0)
    assessment_time: datetime


class PredictRequest(BaseModel):
    features: dict[str, Any] = Field(default_factory=dict)
    patient_id: str | None = None
