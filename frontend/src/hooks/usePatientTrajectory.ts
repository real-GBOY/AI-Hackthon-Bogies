import { useEffect, useState } from "react";
import { getTrajectory, listPatients, PredictionError } from "../api";
import type { RiskResult } from "../types";

export type TrajectoryLoadStatus = "loading" | "live" | "fallback";

/**
 * Loads the first seeded patient's live trajectory on mount, falling back to
 * `fallback` (mock data) if the backend is unreachable — same fallback
 * justification as the clinician dashboard's useLivePatients.
 */
export function usePatientTrajectory(fallback: RiskResult): { riskResult: RiskResult; status: TrajectoryLoadStatus } {
  const [riskResult, setRiskResult] = useState<RiskResult>(fallback);
  const [status, setStatus] = useState<TrajectoryLoadStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const ids = await listPatients();
        if (ids.length === 0) throw new PredictionError("No patients available");
        const trajectory = await getTrajectory(ids[0]);
        if (!cancelled) {
          setRiskResult(trajectory);
          setStatus("live");
        }
      } catch {
        if (!cancelled) setStatus("fallback");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { riskResult, status };
}
