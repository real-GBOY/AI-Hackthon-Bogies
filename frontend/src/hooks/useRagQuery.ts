import { useState } from "react";
import { PredictionError, queryRag } from "../api";
import type { RagMode, RagQueryResponse } from "../types";

export type RagQueryStatus = "idle" | "loading" | "success" | "error";

/** Shared submit/status/result state for anything that asks the RAG assistant a question (PatientChat, PatientJourney). */
export function useRagQuery(): {
  status: RagQueryStatus;
  data: RagQueryResponse | null;
  error: string | null;
  ask: (question: string, mode: RagMode) => Promise<void>;
} {
  const [status, setStatus] = useState<RagQueryStatus>("idle");
  const [data, setData] = useState<RagQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(question: string, mode: RagMode) {
    setStatus("loading");
    setError(null);
    try {
      const response = await queryRag(question, mode);
      setData(response);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof PredictionError ? err.message : "Unexpected error");
    }
  }

  return { status, data, error, ask };
}
