import type { Driver, Patient } from "../types";
import { buildRiskResult } from "./patients";

/**
 * Phase 4 demo: a single hand-crafted patient journey (per the project
 * roadmap — this is a rehearsed demo thread, not a live model). The risk
 * scores/drivers below are authored by hand, consistent with every other
 * mock patient in this app.
 *
 * The "why did my risk change" explanation is NOT hand-written — it is the
 * real, captured output of `generate.py` run against this exact clinical
 * scenario through the actual guideline-RAG pipeline (retrieval + grounded
 * generation), so the citations are genuine. See project root for the run.
 */

export interface JourneyAssessment {
  week: number;
  label: string;
  systolic: number;
  diastolic: number;
  symptoms: string[];
  riskScore: number;
}

export const demoAssessments: JourneyAssessment[] = [
  { week: 20, label: "Week 20", systolic: 112, diastolic: 70, symptoms: [], riskScore: 0.08 },
  { week: 24, label: "Week 24", systolic: 118, diastolic: 76, symptoms: [], riskScore: 0.1 },
  { week: 28, label: "Week 28", systolic: 132, diastolic: 84, symptoms: ["mild ankle swelling"], riskScore: 0.32 },
  {
    week: 30,
    label: "Week 30 (today)",
    systolic: 165,
    diastolic: 95,
    symptoms: ["severe headache", "blurred vision"],
    riskScore: 0.89,
  },
];

const demoDrivers: Driver[] = [
  { feature: "systolic_bp", impact: 0.42 },
  { feature: "new_headache", impact: 0.28 },
  { feature: "visual_disturbance", impact: 0.21 },
];

export const demoPatient: Patient = {
  id: "DEMO-001",
  name: "Demo patient",
  age: 28,
  riskResult: buildRiskResult(
    demoAssessments.map((a) => a.riskScore),
    demoDrivers,
    "2026-08-18T00:00:00Z",
  ),
};

export const demoAdaptiveFollowUp: { question: string; answer: string }[] = [
  { question: "How severe is the headache, on a scale of 1-10?", answer: "8 out of 10 — started this morning." },
  {
    question: "Any visual changes — blurring, flashing lights, spots?",
    answer: "Yes, some blurring and occasional flashing lights.",
  },
  {
    question: "What was your blood pressure at your last visit?",
    answer: "118/76 at 24 weeks — it had always been normal before.",
  },
];

export interface DemoCitation {
  source: string;
  page: number;
}

/**
 * Captured verbatim from a real run of generate.py against this scenario:
 *   python generate.py "A patient at 30 weeks gestation has blood pressure
 *   165/95 with a new severe headache and blurred vision, after having a
 *   normal blood pressure of 118/76 at week 24. Why does this indicate
 *   increased risk and what should happen next?"
 * Two obvious PDF-hyphenation artifacts ("severerange", "maternalfetal") were
 * corrected for readability; the claims and citations are unedited.
 */
export const whyRiskChanged = {
  question: "Why did my risk change?",
  answer:
    "The blood pressure of 165 mmHg systolic meets the definition of severe hypertension (≥ 160 mmHg), and the new severe headache and blurred vision are recognized severe features of preeclampsia. Both severe-range blood pressures and any severe feature raise the risk of maternal morbidity and mortality [ACOG-222 p.4], and severe hypertension should be confirmed quickly so that timely antihypertensive therapy can be started [ACOG-222 p.2]. This presentation signals an increased risk and should be managed as preeclampsia with severe features, with immediate confirmation of the blood pressure and prompt initiation of antihypertensive treatment together with close maternal-fetal monitoring.",
  citations: [
    { source: "ACOG-222", page: 4 },
    { source: "ACOG-222", page: 2 },
  ] as DemoCitation[],
  retrieved: [
    { source: "NICE-NG133", page: 17, score: 0.8227 },
    { source: "ACOG-222", page: 2, score: 0.8012 },
    { source: "ACOG-222", page: 3, score: 0.7977 },
    { source: "ACOG-222", page: 2, score: 0.7941 },
    { source: "ACOG-222", page: 8, score: 0.7908 },
  ] as (DemoCitation & { score: number })[],
};

export const sourceFullNames: Record<string, string> = {
  "ACOG-222": "Gestational Hypertension & Preeclampsia, ACOG Practice Bulletin No. 222",
  WHO: "WHO Recommendations for the Prevention and Treatment of Pre-eclampsia and Eclampsia, 2011",
  "NICE-NG133": "NICE, Hypertension in Pregnancy: Diagnosis and Management",
};
