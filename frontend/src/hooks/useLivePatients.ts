import { useEffect, useState } from "react";
import { getPatientProfile, getTrajectory, listPatients, PredictionError } from "../api";
import type { Patient } from "../types";

export type PatientSource = "loading" | "live" | "error";

/**
 * Loads every seeded patient's live trajectory + profile from the backend on
 * mount. No mock fallback — if the backend is unreachable or has no seeded
 * patients, source is 'error' and callers render an explicit error state
 * rather than silently showing fake patients.
 */
export function useLivePatients(): { patients: Patient[]; source: PatientSource; error: string | null } {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [source, setSource] = useState<PatientSource>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLivePatients() {
      try {
        const ids = await listPatients();
        if (ids.length === 0) throw new PredictionError("No seeded patients on the backend");

        const results = await Promise.all(
          ids.map(async (id): Promise<Patient> => {
            const [riskResult, profile] = await Promise.all([getTrajectory(id), getPatientProfile(id)]);
            return { id, name: profile.name, age: profile.age, riskResult };
          }),
        );

        if (!cancelled) {
          setPatients(results);
          setSource("live");
        }
      } catch (err) {
        if (!cancelled) {
          setSource("error");
          setError(err instanceof Error ? err.message : "Could not reach the ML service");
        }
      }
    }

    loadLivePatients();
    return () => {
      cancelled = true;
    };
  }, []);

  return { patients, source, error };
}
