import { useEffect, useState } from "react";
import { getTrajectory, listPatients, PredictionError } from "../api";
import type { RiskResult } from "../types";

export type TrajectoryLoadStatus = "loading" | "success" | "error";

/**
 * Loads the first seeded patient's live trajectory on mount. No mock
 * fallback — same contract as useLivePatients.
 */
export function usePatientTrajectory(): { riskResult: RiskResult | null; status: TrajectoryLoadStatus; error: string | null } {
  const [riskResult, setRiskResult] = useState<RiskResult | null>(null);
  const [status, setStatus] = useState<TrajectoryLoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const ids = await listPatients();
        if (ids.length === 0) throw new PredictionError("No patients available");
        const trajectory = await getTrajectory(ids[0]);
        if (!cancelled) {
          setRiskResult(trajectory);
          setStatus("success");
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Could not reach the ML service");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { riskResult, status, error };
}
