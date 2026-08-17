/**
 * The frontend's copy of ml/schemas.py's RiskResult contract. Field names
 * and shapes must stay in sync with the backend — nothing here may name a
 * specific disease.
 */

export type RiskCategory = "low" | "moderate" | "high";
export type TrajectoryDirection = "rising" | "stable" | "falling";

export interface TrajectoryPoint {
  time: string;
  risk: number;
}

export interface Driver {
  feature: string;
  impact: number;
}

export interface Uncertainty {
  flag: boolean;
  reason: string | null;
}

export interface RiskResult {
  risk_score: number;
  risk_category: RiskCategory;
  trajectory: TrajectoryPoint[];
  trajectory_direction: TrajectoryDirection;
  drivers: Driver[];
  uncertainty: Uncertainty;
  confidence: number;
  assessment_time: string;
}

/** A patient/subject's identity, kept separate from their risk result. */
export interface PatientIdentity {
  id: string;
  name: string;
  age: number;
}

export interface Patient extends PatientIdentity {
  riskResult: RiskResult;
}
