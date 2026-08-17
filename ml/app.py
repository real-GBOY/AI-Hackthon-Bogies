"""
Disease-agnostic FastAPI service for the clinical decision-support prototype.

/predict depends on the RiskModel interface (models/base.py), not on any
concrete model — get_model() is the single place to swap the dummy model for
a real one once a disease/dataset are chosen and a model is trained.
"""

from __future__ import annotations

import random
from datetime import UTC, datetime

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import MockRiskModel, RiskModel
from schemas import (
    Driver,
    PredictRequest,
    RiskCategory,
    RiskResult,
    TrajectoryDirection,
    TrajectoryPoint,
    Uncertainty,
)

app = FastAPI(title="Clinical Risk Scaffold API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    # Vite picks the next free port if 5173 is busy (5174, 5175, ...), so match
    # any localhost/127.0.0.1 port rather than hardcoding one.
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Risk-category boundaries and the margin used to flag "near a boundary"
# predictions as uncertain. Disease-agnostic placeholders — revisit once a
# real model's calibration is known.
RISK_LOW_BOUNDARY = 0.34
RISK_HIGH_BOUNDARY = 0.67
UNCERTAINTY_MARGIN = 0.05

# Trend classification band: trajectory deltas smaller than this count as "stable".
TREND_STABLE_BAND = 0.03

_model: RiskModel = MockRiskModel()


def get_model() -> RiskModel:
    """FastAPI dependency. Replace the MockRiskModel instance above with a
    real trained model once one exists — no other code needs to change."""
    return _model


def categorize_risk(score: float) -> RiskCategory:
    if score < RISK_LOW_BOUNDARY:
        return RiskCategory.LOW
    if score < RISK_HIGH_BOUNDARY:
        return RiskCategory.MODERATE
    return RiskCategory.HIGH


def build_trajectory(current_score: float, num_points: int = 5) -> list[TrajectoryPoint]:
    """
    DEMO ONLY: synthesizes a plausible history ending at current_score, since
    there is no real longitudinal dataset yet. In production this is replaced
    by scoring a patient's actual historical assessments, one per timepoint.
    """
    scores = [current_score]
    score = current_score
    for _ in range(num_points - 1):
        score = min(1.0, max(0.0, score + random.uniform(-0.12, 0.12)))
        scores.append(score)
    scores.reverse()
    return [TrajectoryPoint(time=f"assessment_{i + 1}", risk=round(s, 3)) for i, s in enumerate(scores)]


def resolve_trajectory_direction(trajectory: list[TrajectoryPoint]) -> TrajectoryDirection:
    if len(trajectory) < 2:
        return TrajectoryDirection.STABLE
    delta = trajectory[-1].risk - trajectory[-2].risk
    if delta > TREND_STABLE_BAND:
        return TrajectoryDirection.RISING
    if delta < -TREND_STABLE_BAND:
        return TrajectoryDirection.FALLING
    return TrajectoryDirection.STABLE


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict", response_model=RiskResult)
def predict(request: PredictRequest, model: RiskModel = Depends(get_model)) -> RiskResult:
    try:
        risk_score = model.predict_proba(request.features)
    except Exception as exc:  # a real model can fail on malformed/missing features
        raise HTTPException(status_code=422, detail=f"Model failed to score features: {exc}") from exc

    if not 0.0 <= risk_score <= 1.0:
        raise HTTPException(status_code=500, detail="Model returned a risk score outside [0, 1]")

    try:
        raw_drivers = model.explain(request.features)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Model failed to explain features: {exc}") from exc

    drivers = [Driver(feature=name, impact=impact) for name, impact in raw_drivers]
    trajectory = build_trajectory(risk_score)
    direction = resolve_trajectory_direction(trajectory)
    near_boundary = any(
        abs(risk_score - boundary) <= UNCERTAINTY_MARGIN for boundary in (RISK_LOW_BOUNDARY, RISK_HIGH_BOUNDARY)
    )

    return RiskResult(
        risk_score=risk_score,
        risk_category=categorize_risk(risk_score),
        trajectory=trajectory,
        trajectory_direction=direction,
        drivers=drivers,
        uncertainty=Uncertainty(
            flag=near_boundary,
            reason="Risk score is close to a category boundary" if near_boundary else None,
        ),
        # Placeholder until a real model exposes calibrated confidence/uncertainty.
        confidence=round(random.uniform(0.6, 0.95), 3),
        assessment_time=datetime.now(UTC),
    )
