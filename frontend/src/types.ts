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
  /** Raw longitudinal assessment history (ml/content_routes.py's /patients/{id}/assessments) — undefined until useLivePatients loads it. */
  assessments?: AssessmentOut[];
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

/** Mirrors ml/schemas.py's Tone enum — used across timeline/care-plan/learn content. */
export type Tone = "current" | "watch" | "neutral" | "stable";

export interface TodaysTask {
  title: string;
  detail: string;
}

export interface NextAppointment {
  when: string;
  detail: string;
}

/** Mirrors ml/schemas.py's PatientAppContent — content backing the mobile app's home/ask screens. */
export interface PatientAppContent {
  first_name: string;
  full_name: string;
  initials: string;
  week: number;
  due_date: string;
  status_label: string;
  todays_task: TodaysTask;
  next_appointment: NextAppointment;
  suggested_questions: string[];
}

export interface TimelineEvent {
  title: string;
  detail: string;
  tone: Tone;
}

export interface CarePlanAppointment {
  when: string;
  detail: string;
}

export interface CarePlanMonitoringItem {
  label: string;
  cadence: string;
  tone: Tone;
}

export interface CarePlan {
  appointments: CarePlanAppointment[];
  monitoring: CarePlanMonitoringItem[];
  to_discuss: string[];
}

export interface IntakeFollowupQA {
  question: string;
  answer: string;
}

export interface ContentCitation {
  source: string;
  page: number;
}

export interface RetrievedPassage extends ContentCitation {
  score: number;
}

export interface CapturedQA {
  question: string;
  answer: string;
  citations: ContentCitation[];
  retrieved: RetrievedPassage[];
}

/** Mirrors ml/schemas.py's PatientProfile — everything RiskResult doesn't cover. */
export interface PatientProfile {
  patient_id: string;
  name: string;
  age: number;
  app_content: PatientAppContent | null;
  timeline: TimelineEvent[] | null;
  care_plan: CarePlan | null;
  intake_followup: IntakeFollowupQA[] | null;
  captured_qa: CapturedQA | null;
}

export interface LearnArticleSummary {
  slug: string;
  title: string;
  meta: string;
  tone: Tone;
  featured: boolean;
}

export interface LearnArticleDetail extends LearnArticleSummary {
  detail: string | null;
}

export interface ClinicianOut {
  name: string;
  role: string;
  panel: string;
}

export interface AssessmentOut {
  assessment_id: string;
  assessment_time: string;
  features: Record<string, unknown>;
}
