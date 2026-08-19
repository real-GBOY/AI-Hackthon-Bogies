import { useEffect, useState } from "react";
import { getTrajectory, listPatients, PredictionError } from "../api";
import type { Patient, PatientIdentity } from "../types";

export type PatientSource = "loading" | "live" | "mock";

/**
 * Loads every seeded patient's live trajectory from the backend on mount,
 * falling back to `fallbackPatients` (mock data) if the backend is
 * unreachable or has no seeded patients — same fallback contract as
 * PatientDashboard.tsx's usePatientTrajectory.
 */
export function useLivePatients(
  fallbackPatients: Patient[],
  resolveIdentity: (id: string) => PatientIdentity,
): { patients: Patient[]; source: PatientSource } {
  const [patients, setPatients] = useState<Patient[]>(fallbackPatients);
  const [source, setSource] = useState<PatientSource>("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadLivePatients() {
      try {
        const ids = await listPatients();
        if (ids.length === 0) throw new PredictionError("No seeded patients on the backend");

        const results = await Promise.all(
          ids.map(async (id): Promise<Patient> => {
            const riskResult = await getTrajectory(id);
            return { ...resolveIdentity(id), riskResult };
          }),
        );

        if (!cancelled) {
          setPatients(results);
          setSource("live");
        }
      } catch {
        // Backend unreachable — keep the fallback data the caller was
        // already initialized with.
        if (!cancelled) setSource("mock");
      }
    }

    loadLivePatients();
    return () => {
      cancelled = true;
    };
  }, []);

  return { patients, source };
}
