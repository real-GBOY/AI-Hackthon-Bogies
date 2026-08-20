import { useCallback, useRef, useState } from "react";
import { queryRag } from "../api";
import type { RagQueryResponse } from "../types";

export interface AiThread {
  id: number;
  question: string;
  patientId: string | null;
  status: "loading" | "success" | "error";
  data: RagQueryResponse | null;
  error: string | null;
}

const STORAGE_KEY = "hdp-ai-threads";

function loadStoredThreads(): AiThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AiThread[];
    // A thread stuck mid-flight when the tab closed has nothing to resume — drop it
    // rather than show a permanently-spinning entry.
    return parsed.filter((t) => t.status !== "loading");
  } catch {
    return [];
  }
}

function persist(threads: AiThread[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  } catch {
    // Quota exceeded / private browsing — history just won't persist, not fatal.
  }
}

/**
 * Owns the "Ask AI" conversation history. Instantiated once in HdpApp.tsx
 * (not inside AiView.tsx) so it survives AiView being unmounted every time
 * the clinician navigates to another tab and back — and persisted to
 * localStorage so it also survives a full page reload.
 */
export function useAiThreads() {
  const [threads, setThreads] = useState<AiThread[]>(loadStoredThreads);
  const [activeId, setActiveId] = useState<number | null>(() => threads[threads.length - 1]?.id ?? null);
  const [contextPatientId, setContextPatientId] = useState<string | null>(null);
  const nextId = useRef(Math.max(0, ...threads.map((t) => t.id)) + 1);

  const submit = useCallback(async (question: string, patientId: string | null) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    const id = nextId.current++;
    setThreads((prev) => {
      const next = [...prev, { id, question: trimmed, patientId, status: "loading" as const, data: null, error: null }];
      persist(next);
      return next;
    });
    setActiveId(id);

    try {
      const response = await queryRag(trimmed, "clinician");
      setThreads((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, status: "success" as const, data: response } : t));
        persist(next);
        return next;
      });
    } catch (err) {
      setThreads((prev) => {
        const next = prev.map((t) =>
          t.id === id ? { ...t, status: "error" as const, error: err instanceof Error ? err.message : "Unexpected error" } : t,
        );
        persist(next);
        return next;
      });
    }
  }, []);

  const startNew = useCallback(() => {
    setActiveId(null);
    setContextPatientId(null);
  }, []);

  return { threads, activeId, setActiveId, contextPatientId, setContextPatientId, submit, startNew };
}
