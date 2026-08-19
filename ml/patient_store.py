"""
A minimal, real longitudinal patient store — not a database (there's no time
for one and it isn't the point). The point is that a patient's "trajectory"
comes from scoring a real sequence of stored assessments with RulesetRiskModel,
not from build_trajectory()'s random-walk jitter in app.py.

Shape follows data_contract.md exactly: each assessment carries patient_id,
assessment_id, assessment_time, and a features dict. Ordered oldest-first —
callers score in this order to get a real trajectory, per data_contract.md's
"Longitudinal shape" section.

Two hand-authored patients:
  demo-1  Mirrors the existing PatientJourney.tsx demo scenario (28y,
          nulliparous, BP climbing from 118/76 to 165/95, new severe
          headache + visual disturbance by week 30) — same story, now as
          real scored feature sets instead of hardcoded prose.
  demo-2  A stable, low-risk control patient, to show the trajectory view
          isn't just a hard-coded "risk always goes up" demo.
"""

from __future__ import annotations

from typing import Any, TypedDict


class Assessment(TypedDict):
    patient_id: str
    assessment_id: str
    assessment_time: str
    features: dict[str, Any]


PATIENTS: dict[str, list[Assessment]] = {
    "demo-1": [
        {
            "patient_id": "demo-1",
            "assessment_id": "demo-1-A1",
            "assessment_time": "2026-02-01T00:00:00Z",
            "features": {"bp_systolic": 118, "bp_diastolic": 76, "nulliparity": True},
        },
        {
            "patient_id": "demo-1",
            "assessment_id": "demo-1-A2",
            "assessment_time": "2026-03-01T00:00:00Z",
            "features": {"bp_systolic": 120, "bp_diastolic": 78, "nulliparity": True},
        },
        {
            "patient_id": "demo-1",
            "assessment_id": "demo-1-A3",
            "assessment_time": "2026-05-01T00:00:00Z",
            "features": {
                "bp_systolic": 130,
                "bp_diastolic": 85,
                "nulliparity": True,
                "family_history_preeclampsia": True,
            },
        },
        {
            "patient_id": "demo-1",
            "assessment_id": "demo-1-A4",
            "assessment_time": "2026-06-01T00:00:00Z",
            "features": {
                "bp_systolic": 145,
                "bp_diastolic": 92,
                "nulliparity": True,
                "family_history_preeclampsia": True,
                "proteinuria_present": True,
            },
        },
        {
            "patient_id": "demo-1",
            "assessment_id": "demo-1-A5",
            "assessment_time": "2026-06-15T00:00:00Z",
            "features": {
                "bp_systolic": 165,
                "bp_diastolic": 95,
                "nulliparity": True,
                "family_history_preeclampsia": True,
                "proteinuria_present": True,
                "severe_headache": True,
                "visual_disturbance": True,
            },
        },
    ],
    "demo-2": [
        {
            "patient_id": "demo-2",
            "assessment_id": "demo-2-A1",
            "assessment_time": "2026-02-15T00:00:00Z",
            "features": {"bp_systolic": 112, "bp_diastolic": 70},
        },
        {
            "patient_id": "demo-2",
            "assessment_id": "demo-2-A2",
            "assessment_time": "2026-04-01T00:00:00Z",
            "features": {"bp_systolic": 115, "bp_diastolic": 72},
        },
        {
            "patient_id": "demo-2",
            "assessment_id": "demo-2-A3",
            "assessment_time": "2026-05-15T00:00:00Z",
            "features": {"bp_systolic": 118, "bp_diastolic": 74},
        },
        {
            "patient_id": "demo-2",
            "assessment_id": "demo-2-A4",
            "assessment_time": "2026-07-01T00:00:00Z",
            "features": {"bp_systolic": 122, "bp_diastolic": 78},
        },
    ],
}


class InMemoryPatientStore:
    """Wraps PATIENTS in the same interface PostgresPatientStore (ml/db.py)
    exposes, so app.py can select either store at runtime (PATIENT_STORE env
    var) without branching in every route. This is the default store and the
    required fallback if Postgres is configured but unreachable — see
    dbMigration.md. PATIENTS itself is untouched; this only wraps it."""

    def list_patient_ids(self) -> list[str]:
        return sorted(PATIENTS.keys())

    def get_assessments(self, patient_id: str) -> list[Assessment] | None:
        return PATIENTS.get(patient_id)
