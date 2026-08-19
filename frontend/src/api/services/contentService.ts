import type { AssessmentOut, ClinicianOut, PatientProfile } from "../../types";
import { PredictionError } from "../config";
import { fetchClinician, fetchPatientAssessments, fetchPatientProfile } from "../endpoints/content";
import { isAssessmentList, isClinician, isPatientProfile } from "../guards";

export async function getPatientProfile(patientId: string): Promise<PatientProfile> {
  const response = await fetchPatientProfile(patientId);
  if (!response.ok) {
    throw new PredictionError(`Profile request failed: ${response.status} ${response.statusText}`);
  }
  const body = await response.json();
  if (!isPatientProfile(body)) {
    throw new PredictionError("Profile response did not match the expected PatientProfile shape");
  }
  return body;
}

export async function getPatientAssessments(patientId: string): Promise<AssessmentOut[]> {
  const response = await fetchPatientAssessments(patientId);
  if (!response.ok) {
    throw new PredictionError(`Assessments request failed: ${response.status} ${response.statusText}`);
  }
  const body = await response.json();
  if (!isAssessmentList(body)) {
    throw new PredictionError("Assessments response did not match the expected shape");
  }
  return body;
}

export async function getClinician(): Promise<ClinicianOut> {
  const response = await fetchClinician();
  if (!response.ok) {
    throw new PredictionError(`Clinician request failed: ${response.status} ${response.statusText}`);
  }
  const body = await response.json();
  if (!isClinician(body)) {
    throw new PredictionError("Clinician response did not match the expected shape");
  }
  return body;
}
