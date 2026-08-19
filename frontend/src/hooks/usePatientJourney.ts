import { useEffect, useState } from "react";
import { getPatientAssessments, getPatientProfile, getTrajectory } from "../api";
import type { AssessmentOut, PatientProfile, RiskResult } from "../types";

export type JourneyLoadStatus = "loading" | "success" | "error";

export interface PatientJourneyData {
  profile: PatientProfile;
  assessments: AssessmentOut[];
  riskResult: RiskResult;
}

/** Loads the demo patient's profile, assessment history, and risk trajectory together — used by PatientJourney.tsx. */
export function usePatientJourney(patientId: string): {
  data: PatientJourneyData | null;
  status: JourneyLoadStatus;
  error: string | null;
} {
  const [data, setData] = useState<PatientJourneyData | null>(null);
  const [status, setStatus] = useState<JourneyLoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [profile, assessments, riskResult] = await Promise.all([
          getPatientProfile(patientId),
          getPatientAssessments(patientId),
          getTrajectory(patientId),
        ]);
        if (!cancelled) {
          setData({ profile, assessments, riskResult });
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
  }, [patientId]);

  return { data, status, error };
}
