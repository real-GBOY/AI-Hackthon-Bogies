import { fetchWithTimeout } from "../config";

/** POST /predict (ml/app.py) */
export function fetchPrediction(features: Record<string, unknown>): Promise<Response> {
  return fetchWithTimeout("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features }),
  });
}

/** GET /health (ml/app.py) */
export function fetchHealth(): Promise<Response> {
  return fetchWithTimeout("/health");
}
