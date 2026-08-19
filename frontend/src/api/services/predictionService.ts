import type { RiskResult } from "../../types";
import { PredictionError } from "../config";
import { fetchHealth, fetchPrediction } from "../endpoints/prediction";
import { isRiskResult } from "../guards";

/**
 * Calls the FastAPI /predict endpoint. Not used by the dashboard's default
 * render path (that reads real per-patient trajectories instead) — this is
 * what useServiceHealthCheck's "Check live ML service" button calls as a
 * demo probe. Throws PredictionError on any failure (network, timeout,
 * non-2xx, malformed body).
 */
export async function predict(features: Record<string, unknown>): Promise<RiskResult> {
  const response = await fetchPrediction(features);

  if (!response.ok) {
    throw new PredictionError(`Prediction request failed: ${response.status} ${response.statusText}`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new PredictionError("Prediction response was not valid JSON", error);
  }

  if (!isRiskResult(body)) {
    throw new PredictionError("Prediction response did not match the expected RiskResult shape");
  }

  return body;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetchHealth();
    return response.ok;
  } catch {
    return false;
  }
}
