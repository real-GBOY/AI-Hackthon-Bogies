/**
 * Base URL, timeouts, and the shared fetch wrapper for the ML service
 * (ml/app.py + ml/rag_routes.py). All endpoint modules under ./endpoints
 * build requests through fetchWithTimeout so timeout/abort handling and
 * error typing stay in one place.
 */

export const ML_SERVICE_URL = "http://localhost:8000";
export const DEFAULT_TIMEOUT_MS = 5000;
// The Groq free tier is rate-limited enough that a live RAG call can take a
// while under load (see generate.py's call_with_retry) — give RAG requests a
// much longer budget than the default health-style calls.
export const RAG_TIMEOUT_MS = 30000;

export class PredictionError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "PredictionError";
    this.cause = cause;
  }
}

export async function fetchWithTimeout(
  path: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${ML_SERVICE_URL}${path}`, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new PredictionError("Request to the ML service timed out", error);
    }
    throw new PredictionError("Could not reach the ML service", error);
  } finally {
    clearTimeout(timeoutId);
  }
}
