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
            "features": {"bp_systolic": 118, "bp_diastolic": 76, "nulliparity": True, "gestational_week": 12},
        },
        {
            "patient_id": "demo-1",
            "assessment_id": "demo-1-A2",
            "assessment_time": "2026-03-01T00:00:00Z",
            "features": {"bp_systolic": 120, "bp_diastolic": 78, "nulliparity": True, "gestational_week": 18},
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
                "gestational_week": 26,
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
                "gestational_week": 30,
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
                "gestational_week": 32,
            },
        },
    ],
    "demo-2": [
        {
            "patient_id": "demo-2",
            "assessment_id": "demo-2-A1",
            "assessment_time": "2026-02-15T00:00:00Z",
            "features": {"bp_systolic": 112, "bp_diastolic": 70, "gestational_week": 14},
        },
        {
            "patient_id": "demo-2",
            "assessment_id": "demo-2-A2",
            "assessment_time": "2026-04-01T00:00:00Z",
            "features": {"bp_systolic": 115, "bp_diastolic": 72, "gestational_week": 21},
        },
        {
            "patient_id": "demo-2",
            "assessment_id": "demo-2-A3",
            "assessment_time": "2026-05-15T00:00:00Z",
            "features": {"bp_systolic": 118, "bp_diastolic": 74, "gestational_week": 27},
        },
        {
            "patient_id": "demo-2",
            "assessment_id": "demo-2-A4",
            "assessment_time": "2026-07-01T00:00:00Z",
            "features": {"bp_systolic": 122, "bp_diastolic": 78, "gestational_week": 34},
        },
    ],
}


class PatientContent(TypedDict):
    """Non-scoring content for a patient: app profile, timeline, care plan,
    and the two RAG-adjacent demo threads (intake follow-up, a captured
    "why did my risk change" answer). All optional except name/age — demo-2
    has no authored narrative content, only the fields every patient needs.
    Relocated verbatim from Mobile/src/mock/patient.ts's demoPatientProfile
    and frontend/src/mock/demoJourney.ts (demoAdaptiveFollowUp/whyRiskChanged)
    so both clients read the same content from one place instead of each
    keeping their own hardcoded copy."""

    name: str
    age: int
    app_content: dict[str, Any] | None
    timeline: list[dict[str, Any]] | None
    care_plan: dict[str, Any] | None
    intake_followup: list[dict[str, Any]] | None
    captured_qa: dict[str, Any] | None


PATIENT_CONTENT: dict[str, PatientContent] = {
    "demo-1": {
        "name": "Amara Diallo",
        "age": 28,
        "app_content": {
            "first_name": "Amara",
            "full_name": "Amara Diallo",
            "initials": "AD",
            "week": 34,
            "due_date": "2 October",
            "status_label": "Elevated",
            "todays_task": {"title": "Take your blood pressure", "detail": "Morning reading, before breakfast"},
            "next_appointment": {
                "when": "Tomorrow, 09:30",
                "detail": "Maternal-fetal medicine clinic, Level 3. Bring your home readings.",
            },
            "suggested_questions": [
                "What does my risk mean?",
                "Why is my blood pressure monitored?",
                "What should I ask my doctor?",
            ],
        },
        "timeline": [
            {"title": "Status changed to elevated", "detail": "Week 34 · this week", "tone": "current"},
            {"title": "Urine test", "detail": "Week 32 · more protein than expected", "tone": "watch"},
            {"title": "Clinic visit", "detail": "Week 30 · blood pressure 141/91", "tone": "neutral"},
            {"title": "Aspirin started", "detail": "Week 18 · one tablet daily", "tone": "neutral"},
            {"title": "First appointment", "detail": "Week 12 · booking and bloods", "tone": "neutral"},
        ],
        "care_plan": {
            "appointments": [
                {"when": "Tomorrow, 09:30", "detail": "Clinic visit · BP, urine, scan"},
                {"when": "Tue 25 August, 11:00", "detail": "Bloods · platelets and liver"},
            ],
            "monitoring": [
                {"label": "Blood pressure twice daily", "cadence": "morning, evening", "tone": "current"},
                {"label": "Aspirin 81 mg", "cadence": "daily", "tone": "watch"},
                {"label": "Note swelling or headaches", "cadence": "as they happen", "tone": "stable"},
            ],
            "to_discuss": [
                "Does my protein result change the plan for delivery?",
                "Should I be taking my readings at different times?",
                "What symptoms mean I should call straight away?",
            ],
        },
        "intake_followup": [
            {"question": "How severe is the headache, on a scale of 1-10?", "answer": "8 out of 10 — started this morning."},
            {
                "question": "Any visual changes — blurring, flashing lights, spots?",
                "answer": "Yes, some blurring and occasional flashing lights.",
            },
            {
                "question": "What was your blood pressure at your last visit?",
                "answer": "118/76 at 24 weeks — it had always been normal before.",
            },
        ],
        "captured_qa": {
            "question": "Why did my risk change?",
            "answer": (
                "The blood pressure of 165 mmHg systolic meets the definition of severe hypertension "
                "(≥ 160 mmHg), and the new severe headache and blurred vision are recognized severe "
                "features of preeclampsia. Both severe-range blood pressures and any severe feature raise "
                "the risk of maternal morbidity and mortality [ACOG-222 p.4], and severe hypertension "
                "should be confirmed quickly so that timely antihypertensive therapy can be started "
                "[ACOG-222 p.2]. This presentation signals an increased risk and should be managed as "
                "preeclampsia with severe features, with immediate confirmation of the blood pressure and "
                "prompt initiation of antihypertensive treatment together with close maternal-fetal "
                "monitoring."
            ),
            "citations": [
                {"source": "ACOG-222", "page": 4},
                {"source": "ACOG-222", "page": 2},
            ],
            "retrieved": [
                {"source": "NICE-NG133", "page": 17, "score": 0.8227},
                {"source": "ACOG-222", "page": 2, "score": 0.8012},
                {"source": "ACOG-222", "page": 3, "score": 0.7977},
                {"source": "ACOG-222", "page": 2, "score": 0.7941},
                {"source": "ACOG-222", "page": 8, "score": 0.7908},
            ],
        },
    },
    "demo-2": {
        "name": "Demo Patient B",
        "age": 32,
        "app_content": None,
        "timeline": None,
        "care_plan": None,
        "intake_followup": None,
        "captured_qa": None,
    },
}


LEARN_ARTICLES: list[dict[str, Any]] = [
    {
        "slug": "what-is-preeclampsia",
        "seq": 0,
        "title": "What is preeclampsia?",
        "detail": (
            "A condition of pregnancy involving raised blood pressure. What it is, how it's found, and "
            "why it's treatable when caught early."
        ),
        "meta": "4 min read",
        "tone": "stable",
        "featured": True,
    },
    {
        "slug": "pregnancy-hypertension-explained",
        "seq": 1,
        "title": "Pregnancy hypertension explained",
        "detail": None,
        "meta": "3 min read",
        "tone": "current",
        "featured": False,
    },
    {
        "slug": "why-blood-pressure-is-watched",
        "seq": 2,
        "title": "Why blood pressure is monitored",
        "detail": None,
        "meta": "2 min read",
        "tone": "stable",
        "featured": False,
    },
    {
        "slug": "why-i-might-need-more-monitoring",
        "seq": 3,
        "title": "Why I might need more monitoring",
        "detail": None,
        "meta": "3 min read",
        "tone": "watch",
        "featured": False,
    },
    {
        "slug": "understanding-medical-terms",
        "seq": 4,
        "title": "Understanding medical terms",
        "detail": None,
        "meta": "Glossary",
        "tone": "neutral",
        "featured": False,
    },
]


CLINICIAN: dict[str, str] = {
    "name": "Dr. Rachel Okonjo",
    "role": "Maternal-Fetal Medicine",
    "panel": "Mercy Women's Health",
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

    def get_content(self, patient_id: str) -> PatientContent | None:
        return PATIENT_CONTENT.get(patient_id)

    def list_learn_articles(self) -> list[dict[str, Any]]:
        return LEARN_ARTICLES

    def get_learn_article(self, slug: str) -> dict[str, Any] | None:
        return next((a for a in LEARN_ARTICLES if a["slug"] == slug), None)

    def get_clinician(self) -> dict[str, str]:
        return CLINICIAN
