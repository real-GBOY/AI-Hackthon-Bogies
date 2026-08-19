import type { RiskResult } from "../../types";
import { PredictionError } from "../config";
import { fetchPatientIds, fetchPatientTrajectory } from "../endpoints/patients";
import { isRiskResult } from "../guards";

export interface TrajectoryFetchOptions {
  timeoutMs?: number;
}

export async function listPatients(): Promise<string[]> {
  const response = await fetchPatientIds();
  if (!response.ok) {
    throw new PredictionError(`Listing patients failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as string[];
}

export async function getTrajectory(patientId: string, options: TrajectoryFetchOptions = {}): Promise<RiskResult> {
  const response = await fetchPatientTrajectory(patientId, options.timeoutMs);
  if (!response.ok) {
    throw new PredictionError(`Trajectory request failed: ${response.status} ${response.statusText}`);
  }
  const body = await response.json();
  if (!isRiskResult(body)) {
    throw new PredictionError("Trajectory response did not match the expected RiskResult shape");
  }
  return body;
}
