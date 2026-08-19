import { useState } from "react";
import { predict, PredictionError } from "../api";

export type ServiceHealthStatus = "idle" | "loading" | "success" | "error";

/** Drives App.tsx's "Check live ML service" button — a demo call only, proving the error-handling path. */
export function useServiceHealthCheck(): { status: ServiceHealthStatus; error: string | null; check: () => Promise<void> } {
  const [status, setStatus] = useState<ServiceHealthStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setStatus("loading");
    setError(null);
    try {
      await predict({});
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof PredictionError ? err.message : "Unexpected error");
    }
  }

  return { status, error, check };
}
