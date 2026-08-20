import { useState } from "react";
import { PredictionError, queryRag } from "../api";
import type { RagMode, RagQueryResponse } from "../types";

export type RagQueryStatus = "idle" | "loading" | "success" | "error";

interface Persisted {
  status: RagQueryStatus;
  data: RagQueryResponse | null;
  error: string | null;
}

function loadPersisted(storageKey: string): Persisted | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    // A request stuck mid-flight when the tab closed has nothing to resume.
    return parsed.status === "loading" ? null : parsed;
  } catch {
    return null;
  }
}

function persist(storageKey: string, value: Persisted) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Quota exceeded / private browsing — the answer just won't survive a reload, not fatal.
  }
}

/**
 * Shared submit/status/result state for anything that asks the RAG assistant
 * a question (PatientChat, PatientJourney). Pass `storageKey` to persist the
 * last answer to localStorage — needed for PatientChat, whose parent
 * component (App.tsx's uiMode branch) fully unmounts it whenever the
 * clinician/patient toggle switches away and back, otherwise silently
 * discarding whatever the patient was just shown. PatientJourney's "live"
 * tab intentionally omits storageKey — a fresh call each visit is the point
 * of that demo control, not a bug.
 */
export function useRagQuery(storageKey?: string): {
  status: RagQueryStatus;
  data: RagQueryResponse | null;
  error: string | null;
  ask: (question: string, mode: RagMode) => Promise<void>;
} {
  const initial = storageKey ? loadPersisted(storageKey) : null;
  const [status, setStatus] = useState<RagQueryStatus>(initial?.status ?? "idle");
  const [data, setData] = useState<RagQueryResponse | null>(initial?.data ?? null);
  const [error, setError] = useState<string | null>(initial?.error ?? null);

  async function ask(question: string, mode: RagMode) {
    setStatus("loading");
    setError(null);
    try {
      const response = await queryRag(question, mode);
      setData(response);
      setStatus("success");
      if (storageKey) persist(storageKey, { status: "success", data: response, error: null });
    } catch (err) {
      const message = err instanceof PredictionError ? err.message : "Unexpected error";
      setStatus("error");
      setError(message);
      if (storageKey) persist(storageKey, { status: "error", data: null, error: message });
    }
  }

  return { status, data, error, ask };
}
