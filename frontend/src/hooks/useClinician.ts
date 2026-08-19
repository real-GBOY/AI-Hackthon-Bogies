import { useEffect, useState } from "react";
import { getClinician } from "../api";
import type { ClinicianOut } from "../types";

export type ClinicianLoadStatus = "loading" | "success" | "error";

/** GET /clinician/me on mount — the single seeded clinician identity shown in the sidebar and Settings. */
export function useClinician(): { clinician: ClinicianOut | null; status: ClinicianLoadStatus } {
  const [clinician, setClinician] = useState<ClinicianOut | null>(null);
  const [status, setStatus] = useState<ClinicianLoadStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await getClinician();
        if (!cancelled) {
          setClinician(result);
          setStatus("success");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { clinician, status };
}
