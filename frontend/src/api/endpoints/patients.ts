import { fetchWithTimeout } from "../config";

/** GET /patients — the patient_ids the backend has seeded assessment history for (ml/patient_store.py). */
export function fetchPatientIds(): Promise<Response> {
  return fetchWithTimeout("/patients");
}

/** GET /patients/{id}/trajectory — real, deterministic trajectory for one seeded patient (ml/app.py). */
export function fetchPatientTrajectory(patientId: string, timeoutMs?: number): Promise<Response> {
  return fetchWithTimeout(`/patients/${encodeURIComponent(patientId)}/trajectory`, undefined, timeoutMs);
}
