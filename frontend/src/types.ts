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

/** Extended driver info for models that can cite a source per factor (see ml/schemas.py's DriverDetail). */
export interface DriverDetail {
  feature: string;
  impact: number;
  description: string;
  source: string;
}

export interface Uncertainty {
  flag: boolean;
  reason: string | null;
}

export interface RiskResult {
  patient_id?: string | null;
  risk_score: number;
  risk_category: RiskCategory;
  trajectory: TrajectoryPoint[];
  trajectory_direction: TrajectoryDirection;
  drivers: Driver[];
  driver_details?: DriverDetail[] | null;
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

/**
 * Frontend copy of ml/rag_routes.py's RagQueryResponse contract — the RAG
 * assistant, callable live in either clinician or patient register.
 */
export type RagMode = "clinician" | "patient";

export interface RagCitation {
  source: string;
  page: number;
  score: number;
}

export interface RagQueryResponse {
  answer: string;
  mode: RagMode;
  refused: boolean;
  citations: RagCitation[];
  escalation_flag: boolean;
  safety_override_applied: boolean;
}
