import { fetchWithTimeout } from "../config";

/** GET /patients/{id}/profile — non-scoring content (ml/content_routes.py). */
export function fetchPatientProfile(patientId: string): Promise<Response> {
  return fetchWithTimeout(`/patients/${encodeURIComponent(patientId)}/profile`);
}

/** GET /patients/{id}/assessments — raw longitudinal assessment history. */
export function fetchPatientAssessments(patientId: string): Promise<Response> {
  return fetchWithTimeout(`/patients/${encodeURIComponent(patientId)}/assessments`);
}

/** GET /clinician/me — the single seeded clinician identity (no auth system). */
export function fetchClinician(): Promise<Response> {
  return fetchWithTimeout("/clinician/me");
}
