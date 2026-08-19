"""
A deterministic, guideline-grounded risk-scoring rule engine for hypertensive
disorders of pregnancy / preeclampsia.

This is NOT a trained model. There is no labeled dataset backing this project
(see ../../data_contract.md), so there is nothing to fit weights to and no
way to validate calibration honestly in the time available. Every weight
below is hand-set to reflect how strongly the cited guideline passage treats
that factor (a severe-range finding weighs far more than a single moderate
history risk factor) — not a statistically fitted coefficient. Swap this for
a real trained RiskModel once a validated dataset exists; see base.py — no
other code needs to change.

Every feature below carries the real filename + page of the guideline
passage it came from, in the same "[filename p.X]" citation style the RAG
pipeline (rag.py/generate.py) already uses, pulled from the actual indexed
PDFs in RESEARCH/09_Clinical_Guidelines/.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from .base import RiskModel

ACOG = "Gestational_Hypertension_and_Preeclampsia_ACOG_Practice_Bulletin,_Number_222_1605448006.pdf"
NICE = "hypertension-in-pregnancy-diagnosis-and-management-pdf-66141717671365.pdf"
WHO = "2011c-who_pe_final_1584190059.pdf"


@dataclass(frozen=True)
class FeatureDef:
    weight: float
    source: str
    description: str


# Baseline offset so a patient with none of these factors and normal blood
# pressure scores solidly "low" rather than sitting near a boundary.
BIAS = -3.0

# High-risk history factors: NICE NG133 recommends aspirin prophylaxis for
# ANY ONE of these; ACOG 222 lists the same set as its high-risk aspirin
# indication. Weighted well above the moderate-risk group below.
HIGH_RISK_HISTORY: dict[str, FeatureDef] = {
    "prior_hypertensive_pregnancy": FeatureDef(
        1.4, f"{NICE} p.7", "Hypertensive disease during a previous pregnancy"
    ),
    "chronic_kidney_disease": FeatureDef(1.4, f"{NICE} p.7", "Chronic kidney disease"),
    "autoimmune_disease": FeatureDef(
        1.4, f"{NICE} p.7", "Autoimmune disease (e.g. lupus, antiphospholipid syndrome)"
    ),
    "pregestational_diabetes": FeatureDef(1.4, f"{NICE} p.7", "Type 1 or type 2 diabetes"),
    "chronic_hypertension": FeatureDef(1.4, f"{NICE} p.7", "Chronic hypertension"),
    "multifetal_gestation": FeatureDef(1.4, f"{ACOG} p.7", "Multi-fetal gestation (e.g. twins)"),
}

# Moderate-risk history factors: NICE NG133 only recommends aspirin when a
# woman has MORE THAN ONE of these — no single one is sufficient alone,
# reflected here by a smaller per-factor weight than the high-risk group.
MODERATE_RISK_HISTORY: dict[str, FeatureDef] = {
    "nulliparity": FeatureDef(0.6, f"{NICE} p.7", "First pregnancy (nulliparity)"),
    "maternal_age_40_or_older": FeatureDef(0.6, f"{NICE} p.7", "Maternal age 40 years or older"),
    "bmi_35_or_higher": FeatureDef(0.6, f"{NICE} p.7", "BMI 35 kg/m^2 or higher at first antenatal visit"),
    "family_history_preeclampsia": FeatureDef(
        0.6, f"{ACOG} p.8", "Family history of preeclampsia (mother or sister)"
    ),
}

# Blood-pressure banding per ACOG 222 (p.2-3) / NICE NG133 (p.42): >=140/90
# defines hypertension in pregnancy; >=160/110 defines the severe range.
BP_SEVERE_SYSTOLIC = 160
BP_SEVERE_DIASTOLIC = 110
BP_ELEVATED_SYSTOLIC = 140
BP_ELEVATED_DIASTOLIC = 90
BP_SEVERE = FeatureDef(3.0, f"{ACOG} p.2-3", "Blood pressure in the severe range (>=160/110 mmHg)")
BP_ELEVATED = FeatureDef(1.2, f"{NICE} p.42", "Blood pressure elevated but below severe range (>=140/90 mmHg)")

# Proteinuria threshold per ACOG 222 p.3 / WHO p.12.
PROTEINURIA = FeatureDef(
    1.6, f"{ACOG} p.3", "Proteinuria >=300 mg/24h urine or protein:creatinine ratio >=0.30"
)

# ACOG 222 "severe features" (p.17) and NICE NG133 severe pre-eclampsia
# symptoms (p.6, p.43).
SEVERE_SYMPTOMS: dict[str, FeatureDef] = {
    "severe_headache": FeatureDef(1.8, f"{NICE} p.43", "Severe or recurring headache"),
    "visual_disturbance": FeatureDef(1.8, f"{NICE} p.6", "Visual disturbance (blurring, flashing, scotomata)"),
    "epigastric_pain": FeatureDef(1.8, f"{NICE} p.6", "Severe pain just below the ribs (epigastric pain)"),
    "nausea_or_vomiting": FeatureDef(1.0, f"{NICE} p.6", "Nausea or vomiting"),
}
LAB_ABNORMALITIES: dict[str, FeatureDef] = {
    "thrombocytopenia": FeatureDef(2.0, f"{ACOG} p.17", "Platelet count below 100,000 x10^9/L"),
    "elevated_liver_enzymes": FeatureDef(2.0, f"{ACOG} p.17", "Liver enzymes at or above twice the upper limit of normal"),
}

BOOLEAN_FEATURES: dict[str, FeatureDef] = {
    **HIGH_RISK_HISTORY,
    **MODERATE_RISK_HISTORY,
    **SEVERE_SYMPTOMS,
    **LAB_ABNORMALITIES,
    "proteinuria_present": PROTEINURIA,
}


def _bp_contribution(features: dict[str, Any]) -> tuple[str, float, FeatureDef] | None:
    systolic = features.get("bp_systolic")
    diastolic = features.get("bp_diastolic")
    if systolic is None and diastolic is None:
        return None
    systolic = systolic or 0
    diastolic = diastolic or 0
    if systolic >= BP_SEVERE_SYSTOLIC or diastolic >= BP_SEVERE_DIASTOLIC:
        return ("blood_pressure_severe", BP_SEVERE.weight, BP_SEVERE)
    if systolic >= BP_ELEVATED_SYSTOLIC or diastolic >= BP_ELEVATED_DIASTOLIC:
        return ("blood_pressure_elevated", BP_ELEVATED.weight, BP_ELEVATED)
    return None


def _active_contributions(features: dict[str, Any]) -> list[tuple[str, float, FeatureDef]]:
    contributions = [
        (name, fdef.weight, fdef) for name, fdef in BOOLEAN_FEATURES.items() if features.get(name)
    ]
    bp = _bp_contribution(features)
    if bp is not None:
        contributions.append(bp)
    return contributions


class RulesetRiskModel(RiskModel):
    """Deterministic, guideline-cited weighted-sum risk scorer. See the
    module docstring: this is a rule engine, not a trained model."""

    def _raw_score(self, features: dict[str, Any]) -> float:
        return BIAS + sum(weight for _, weight, _ in _active_contributions(features))

    def predict_proba(self, features: dict[str, Any]) -> float:
        raw = self._raw_score(features)
        return round(1 / (1 + math.exp(-raw)), 3)

    def explain(self, features: dict[str, Any]) -> list[tuple[str, float]]:
        contributions = sorted(_active_contributions(features), key=lambda c: c[1], reverse=True)
        top = [(name, round(weight, 3)) for name, weight, _ in contributions[:3]]
        while len(top) < 3:
            top.append((f"no_additional_risk_factor_{len(top)}", 0.0))
        return top

    def explain_with_citations(self, features: dict[str, Any]) -> list[dict[str, Any]]:
        """Extended explain() that also carries the guideline citation and a
        human-readable description per contributing factor. Used by the
        unified backend (ml/rag_routes.py) so the frontend can show *why*,
        not just a bare feature name."""
        contributions = sorted(_active_contributions(features), key=lambda c: c[1], reverse=True)
        return [
            {"feature": name, "impact": round(weight, 3), "description": fdef.description, "source": fdef.source}
            for name, weight, fdef in contributions
        ]
