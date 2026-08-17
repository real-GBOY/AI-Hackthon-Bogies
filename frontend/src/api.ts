import type { RiskResult } from "./types";

const ML_SERVICE_URL = "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 5000;

export class PredictionError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "PredictionError";
    this.cause = cause;
  }
}

function isRiskResult(value: unknown): value is RiskResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.risk_score === "number" &&
    typeof v.risk_category === "string" &&
    Array.isArray(v.trajectory) &&
    typeof v.trajectory_direction === "string" &&
    Array.isArray(v.drivers) &&
    typeof v.uncertainty === "object" &&
    v.uncertainty !== null &&
    typeof v.confidence === "number"
  );
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new PredictionError("Request to the ML service timed out", error);
    }
    throw new PredictionError("Could not reach the ML service", error);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Calls the FastAPI /predict endpoint. Not used by the dashboard's default
 * render path — the UI renders from mock/patients.ts so it keeps working
 * with or without the ML service running. Throws PredictionError on any
 * failure (network, timeout, non-2xx, malformed body) so callers can fall
 * back to mock data.
 */
export async function predict(features: Record<string, unknown>): Promise<RiskResult> {
  const response = await fetchWithTimeout(`${ML_SERVICE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features }),
  });

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
    const response = await fetchWithTimeout(`${ML_SERVICE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
