/**
 * Population-level derivations for the Dashboard/Queue/Alerts views. Every
 * number here is computed from the real Patient[] the app already has (live
 * backend data, or the mock fallback) — nothing is invented at this layer.
 */

import type { AssessmentOut, Patient, RiskCategory } from "../types";
import { categorizeRisk } from "../lib/risk";
import { bandLabel } from "./theme";

export interface RiskDistribution {
  low: number;
  moderate: number;
  high: number;
  total: number;
}

export function distribution(patients: Patient[]): RiskDistribution {
  const d = { low: 0, moderate: 0, high: 0, total: patients.length };
  for (const p of patients) d[p.riskResult.risk_category] += 1;
  return d;
}

export function pct(n: number, total: number): string {
  if (total === 0) return "0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}

export interface DerivedAlert {
  id: string;
  patientId: string;
  patientName: string;
  text: string;
  category: RiskCategory;
  time: string;
}
/**
 * Alerts aren't a backend concept yet — this derives them from the same
 * signals a clinician would actually want flagged: an uncertainty flag
 * (near a category boundary / thin data) or a patient whose trajectory is
 * actively rising into the high band.
 */
export function deriveAlerts(patients: Patient[]): DerivedAlert[] {
  const alerts: DerivedAlert[] = [];
  for (const p of patients) {
    const r = p.riskResult;
    if (r.uncertainty.flag) {
      alerts.push({
        id: `${p.id}-uncertainty`,
        patientId: p.id,
        patientName: p.name,
        text: r.uncertainty.reason ?? "Risk score is close to a category boundary",
        category: r.risk_category,
        time: r.assessment_time,
      });
    }
    if (r.trajectory_direction === "rising" && r.risk_category === "high") {
      alerts.push({
        id: `${p.id}-rising`,
        patientId: p.id,
        patientName: p.name,
        text: "Risk trending upward within the high-risk band",
        category: r.risk_category,
        time: r.assessment_time,
      });
    }
  }
  return alerts.sort((a, b) => (a.time < b.time ? 1 : -1));
}

export interface TrendPoint {
  label: string;
  low: number;
  moderate: number;
  high: number;
}

/**
 * Aligns every patient's trajectory by assessment index (not calendar time —
 * patients don't share a timeline) and counts how many are in each risk
 * band at each index, among patients who have an assessment at that index.
 * This is a real cross-sectional read of the panel's trajectory data, not
 * fabricated series.
 */
export function panelTrend(patients: Patient[]): TrendPoint[] {
  const maxLen = Math.max(0, ...patients.map((p) => p.riskResult.trajectory.length));
  const points: TrendPoint[] = [];
  for (let i = 0; i < maxLen; i++) {
    const point: TrendPoint = { label: `A${i + 1}`, low: 0, moderate: 0, high: 0 };
    for (const p of patients) {
      const t = p.riskResult.trajectory[i];
      if (!t) continue;
      point[categorizeRisk(t.risk)] += 1;
    }
    points.push(point);
  }
  return points;
}

export function averageScore(patients: Patient[]): number {
  if (patients.length === 0) return 0;
  return patients.reduce((sum, p) => sum + p.riskResult.risk_score, 0) / patients.length;
}

export function dataGapCount(patients: Patient[]): number {
  return patients.filter((p) => p.riskResult.uncertainty.flag).length;
}

export function averageConfidence(patients: Patient[]): number {
  if (patients.length === 0) return 0;
  return patients.reduce((sum, p) => sum + p.riskResult.confidence, 0) / patients.length;
}

/** Priority queue: highest risk, then rising trajectories, first. */
export function priorityQueue(patients: Patient[], limit?: number): Patient[] {
  const sorted = [...patients].sort((a, b) => {
    const scoreDiff = b.riskResult.risk_score - a.riskResult.risk_score;
    if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
    if (a.riskResult.trajectory_direction === b.riskResult.trajectory_direction) return 0;
    return a.riskResult.trajectory_direction === "rising" ? -1 : 1;
  });
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

export function leadingDriver(p: Patient): string | null {
  const drivers = p.riskResult.drivers;
  if (drivers.length === 0) return null;
  const top = [...drivers].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))[0];
  return top.feature;
}

/** "assessment_3" -> "A3"; falls back to the 1-based index if the format changes. */
export function assessmentLabel(time: string, index: number): string {
  const match = /(\d+)\s*$/.exec(time);
  return `A${match ? match[1] : index + 1}`;
}

export function formatFeatureName(feature: string): string {
  return feature
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Natural-language labels for the boolean symptom flags ml/patient_store.py
 * seeds on assessment features. Shared between the dashboard's "Why?"
 * bullets and PatientJourney.tsx's "Today's report" so both read the same
 * flags the same way instead of keeping two copies in sync.
 */
export const SYMPTOM_LABELS: Record<string, string> = {
  severe_headache: "severe headache",
  visual_disturbance: "visual disturbance",
};

export function latestAssessment(patient: Patient): AssessmentOut | null {
  const list = patient.assessments;
  return list && list.length > 0 ? list[list.length - 1] : null;
}

export function baselineAssessment(patient: Patient): AssessmentOut | null {
  const list = patient.assessments;
  return list && list.length > 0 ? list[0] : null;
}

/** The risk band one assessment before the current one, or null if there's no prior point to compare. */
export function previousRiskCategory(patient: Patient): RiskCategory | null {
  const traj = patient.riskResult.trajectory;
  if (traj.length < 2) return null;
  return categorizeRisk(traj[traj.length - 2].risk);
}

function trueFlags(features: Record<string, unknown>): Set<string> {
  return new Set(Object.entries(features).filter(([, v]) => v === true).map(([k]) => k));
}

/** All symptom flags currently true on the latest assessment (not just newly-true ones — see riskChangeReasons for the delta version). */
export function currentSymptoms(patient: Patient): string[] {
  const latest = latestAssessment(patient);
  if (!latest) return [];
  const flags = trueFlags(latest.features);
  return Object.entries(SYMPTOM_LABELS)
    .filter(([key]) => flags.has(key))
    .map(([, label]) => label);
}

/**
 * Builds a real clinical-scenario question for the RAG assistant — no
 * patient name/ID, since the guideline corpus (ACOG/NICE/WHO PDFs) has no
 * concept of a named patient and the retrieval+grounding pipeline correctly
 * refuses a question it can't answer from indexed text (see rag_routes.py /
 * generate.py's strict grounding rule). Mirrors the scenario phrasing
 * PatientJourney.tsx's LIVE_QUESTION already uses successfully — described
 * entirely in terms of real BP/symptom/gestation data, which the guidelines
 * do cover.
 */
export function buildClinicalQuestion(patient: Patient): string {
  const latest = latestAssessment(patient);
  const baseline = baselineAssessment(patient);
  const week = latest?.features.gestational_week as number | undefined;
  const symptoms = currentSymptoms(patient);

  if (!latest) {
    return `A pregnant patient's risk is currently assessed as ${bandLabel(patient.riskResult.risk_category).toLowerCase()}. What clinical guidance applies at this risk level, and what should be monitored going forward?`;
  }

  const parts: string[] = [`A patient${week != null ? ` at ${week} weeks gestation` : ""} has blood pressure ${latest.features.bp_systolic}/${latest.features.bp_diastolic}`];
  if (symptoms.length > 0) parts.push(`with ${symptoms.join(" and ")}`);
  if (baseline && baseline !== latest) {
    parts.push(`after having blood pressure ${baseline.features.bp_systolic}/${baseline.features.bp_diastolic} at an earlier assessment`);
  }

  const category = bandLabel(patient.riskResult.risk_category).toLowerCase();
  return `${parts.join(", ")}. Why does this indicate ${category} risk, and what does clinical guidance recommend?`;
}

/**
 * Plain-language reasons a patient's risk changed — the dashboard's
 * "Why?" bullets. Derived entirely from real assessment features: newly-true
 * symptom flags, plus a blood-pressure delta between the last two
 * assessments. Falls back to the top driver names (already real, from the
 * risk model) for a patient with no assessment history to compare.
 */
export function riskChangeReasons(patient: Patient, limit = 3): string[] {
  const reasons: string[] = [];
  const list = patient.assessments ?? [];
  const latest = list[list.length - 1];
  const prev = list[list.length - 2];

  if (latest) {
    const latestFlags = trueFlags(latest.features);
    const prevFlags = prev ? trueFlags(prev.features) : new Set<string>();
    for (const [key, label] of Object.entries(SYMPTOM_LABELS)) {
      if (latestFlags.has(key) && !prevFlags.has(key)) reasons.push(`New ${label}`);
    }

    if (prev) {
      const dSys = Number(latest.features.bp_systolic) - Number(prev.features.bp_systolic);
      const dDia = Number(latest.features.bp_diastolic) - Number(prev.features.bp_diastolic);
      if (!Number.isNaN(dSys) && !Number.isNaN(dDia)) {
        if (dSys >= 10 || dDia >= 5) reasons.push("Blood pressure increased");
        else if (dSys <= -10 || dDia <= -5) reasons.push("Blood pressure decreased");
      }
    }
  }

  if (reasons.length === 0) {
    // Zero-impact entries are the ruleset model's own "nothing to explain"
    // placeholder (see ml/models/ruleset.py) for a patient with no active
    // drivers — not a real reason, so they're excluded rather than shown.
    const top = [...patient.riskResult.drivers]
      .filter((d) => Math.abs(d.impact) > 0)
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
      .slice(0, 2);
    for (const d of top) reasons.push(formatFeatureName(d.feature));
  }

  return reasons.slice(0, limit);
}
