import type { Driver, Patient, RiskResult, TrajectoryPoint } from "../types";
import { categorizeRisk, directionFromTrajectory, isNearBoundary } from "../lib/risk";

/**
 * Realistic-looking fake data so the dashboard renders demo-ready with no
 * backend running. Disease-agnostic on purpose — feature names are generic
 * clinical-sounding placeholders until a real dataset is chosen.
 *
 * Each seed only supplies raw trajectory scores + drivers; buildRiskResult
 * derives risk_category / trajectory_direction / uncertainty the same way
 * ml/app.py does, so every component can be authored against the exact
 * RiskResult shape a real /predict call will eventually return.
 */

export function buildRiskResult(trajectoryScores: number[], drivers: Driver[], assessmentTime: string): RiskResult {
  const trajectory: TrajectoryPoint[] = trajectoryScores.map((risk, i) => ({
    time: `assessment_${i + 1}`,
    risk,
  }));
  const riskScore = trajectoryScores[trajectoryScores.length - 1];
  const nearBoundary = isNearBoundary(riskScore);

  return {
    risk_score: riskScore,
    risk_category: categorizeRisk(riskScore),
    trajectory,
    trajectory_direction: directionFromTrajectory(trajectory),
    drivers,
    uncertainty: {
      flag: nearBoundary,
      reason: nearBoundary ? "Risk score is close to a category boundary" : null,
    },
    confidence: 0.8,
    assessment_time: assessmentTime,
  };
}

interface MockPatientSeed {
  id: string;
  name: string;
  age: number;
  trajectoryScores: number[];
  drivers: Driver[];
}

const SEEDS: MockPatientSeed[] = [
  {
    id: "P-1001",
    name: "A. Whitfield",
    age: 72,
    trajectoryScores: [0.52, 0.61, 0.7, 0.78, 0.84],
    drivers: [
      { feature: "prior_admissions", impact: 0.31 },
      { feature: "systolic_bp", impact: 0.18 },
      { feature: "medication_adherence", impact: -0.12 },
    ],
  },
  {
    id: "P-1002",
    name: "R. Delgado",
    age: 58,
    trajectoryScores: [0.66, 0.64, 0.63, 0.62, 0.63],
    drivers: [
      { feature: "bmi", impact: 0.22 },
      { feature: "smoking_status", impact: 0.19 },
      { feature: "physical_activity", impact: -0.15 },
    ],
  },
  {
    id: "P-1003",
    name: "M. Chen",
    age: 45,
    trajectoryScores: [0.44, 0.39, 0.34, 0.31, 0.29],
    drivers: [
      { feature: "medication_adherence", impact: 0.2 },
      { feature: "lab_trend_a1c", impact: -0.17 },
      { feature: "age", impact: -0.05 },
    ],
  },
  {
    id: "P-1004",
    name: "S. Okafor",
    age: 66,
    trajectoryScores: [0.5, 0.55, 0.6, 0.66, 0.71],
    drivers: [
      { feature: "prior_admissions", impact: 0.27 },
      { feature: "renal_function", impact: 0.21 },
      { feature: "social_support", impact: -0.09 },
    ],
  },
  {
    id: "P-1005",
    name: "L. Bergström",
    age: 81,
    trajectoryScores: [0.79, 0.83, 0.86, 0.89, 0.91],
    drivers: [
      { feature: "age", impact: 0.29 },
      { feature: "prior_admissions", impact: 0.24 },
      { feature: "polypharmacy_count", impact: 0.14 },
    ],
  },
  {
    id: "P-1006",
    name: "J. Park",
    age: 39,
    trajectoryScores: [0.18, 0.16, 0.14, 0.13, 0.12],
    drivers: [
      { feature: "physical_activity", impact: -0.2 },
      { feature: "bmi", impact: -0.11 },
      { feature: "family_history", impact: 0.08 },
    ],
  },
  {
    id: "P-1007",
    name: "T. Novak",
    age: 54,
    trajectoryScores: [0.4, 0.42, 0.46, 0.45, 0.47],
    drivers: [
      { feature: "systolic_bp", impact: 0.16 },
      { feature: "lab_trend_a1c", impact: 0.12 },
      { feature: "medication_adherence", impact: -0.07 },
    ],
  },
  {
    id: "P-1008",
    name: "H. Osei",
    age: 63,
    trajectoryScores: [0.61, 0.59, 0.58, 0.57, 0.56],
    drivers: [
      { feature: "renal_function", impact: 0.13 },
      { feature: "social_support", impact: -0.1 },
      { feature: "bmi", impact: 0.09 },
    ],
  },
];

const ASSESSMENT_TIME = "2026-08-16T00:00:00Z";

export const mockPatients: Patient[] = SEEDS.map((seed) => ({
  id: seed.id,
  name: seed.name,
  age: seed.age,
  riskResult: buildRiskResult(seed.trajectoryScores, seed.drivers, ASSESSMENT_TIME),
}));
