import { useEffect, useRef, useState } from "react";
import type { Patient, RagQueryResponse } from "../../types";
import { queryRag } from "../../api";
import { COLOR } from "../theme";
import "./Views.css";

interface Thread {
  id: number;
  question: string;
  patientId: string | null;
  status: "loading" | "success" | "error";
  data: RagQueryResponse | null;
  error: string | null;
}

interface AiViewProps {
  patients: Patient[];
  pendingQuestion: { question: string; patientId: string | null } | null;
  onConsumedPending: () => void;
}

function renderAnswer(answer: string) {
  const parts = answer.split(/(\[[^[\]]+\])/g);
  return parts.map((part, i) => {
    const isCitation = /^\[[^\]]+\]$/.test(part);
    if (!isCitation) return <span key={i}>{part}</span>;
    return (
      <span
        key={i}
        className="mono"
        style={{ fontSize: 11, color: COLOR.primary, background: "oklch(0.96 0.02 285)", borderRadius: 4, padding: "0 4px" }}
      >
        {part}
      </span>
    );
  });
}

let threadId = 0;

export function AiView({ patients, pendingQuestion, onConsumedPending }: AiViewProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [contextPatientId, setContextPatientId] = useState<string | null>(null);
  const busyRef = useRef(false);

  async function submit(question: string, patientId: string | null) {
    const trimmed = question.trim();
    if (!trimmed) return;
    const id = ++threadId;
    setThreads((prev) => [...prev, { id, question: trimmed, patientId, status: "loading", data: null, error: null }]);
    setActiveId(id);
    setInput("");
    busyRef.current = true;
    try {
      const response = await queryRag(trimmed, "clinician");
      setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, status: "success", data: response } : t)));
    } catch (err) {
      setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, status: "error", error: err instanceof Error ? err.message : "Unexpected error" } : t)));
    } finally {
      busyRef.current = false;
    }
  }

  useEffect(() => {
    if (pendingQuestion && !busyRef.current) {
      setContextPatientId(pendingQuestion.patientId);
      submit(pendingQuestion.question, pendingQuestion.patientId);
      onConsumedPending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuestion]);

  const active = threads.find((t) => t.id === activeId) ?? threads[threads.length - 1] ?? null;
  const contextPatient = contextPatientId ? patients.find((p) => p.id === contextPatientId) ?? null : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "216px 1fr 300px", alignItems: "stretch", minHeight: "calc(100vh - 118px)", margin: "-26px -28px -40px" }}>
      <div style={{ borderRight: "1px solid #e3e6ec", background: "#fff", display: "flex", flexDirection: "column", gap: 4, padding: "16px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 8px" }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", color: "#9aa1b0" }}>HISTORY</span>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => {
              setActiveId(null);
              setContextPatientId(null);
            }}
            style={{ border: 0, background: "transparent", fontSize: 11.5, fontWeight: 500, color: COLOR.primary, cursor: "pointer", padding: 0 }}
          >
            New
          </button>
        </div>
        {threads.length === 0 && <div style={{ padding: "8px", fontSize: 11.5, color: "#a8aeba" }}>No questions asked yet this session.</div>}
        {[...threads].reverse().map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveId(t.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              textAlign: "left",
              border: 0,
              borderRadius: 8,
              padding: "9px 10px",
              cursor: "pointer",
              background: activeId === t.id ? "#f2f3f6" : "transparent",
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.35 }}>{t.question}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "14px 24px", borderBottom: "1px solid #e3e6ec", background: "#fff" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{contextPatient ? contextPatient.name : "Guideline assistant"}</span>
          {contextPatient && (
            <span className="mono" style={{ fontSize: 11, color: "#8a91a0" }}>
              {contextPatient.id} · {contextPatient.age}y
            </span>
          )}
          {contextPatient && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: "oklch(0.42 0.14 285)",
                background: "oklch(0.96 0.02 285)",
                border: "1px solid oklch(0.90 0.03 285)",
                borderRadius: 6,
                padding: "3px 8px",
              }}
            >
              PATIENT CONTEXT ATTACHED
            </span>
          )}
          <div style={{ flex: 1 }} />
          <select
            value={contextPatientId ?? ""}
            onChange={(e) => setContextPatientId(e.target.value || null)}
            style={{ background: "#fff", border: "1px solid #e3e6ec", borderRadius: 7, padding: "6px 10px", fontSize: 11.5 }}
          >
            <option value="">No patient context</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.id})
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18, padding: "22px 24px 12px", overflow: "auto" }}>
          {!active && (
            <div style={{ fontSize: 13, color: "#8a91a0" }}>
              Ask a guideline-grounded question. Answers come only from the indexed clinical guideline corpus, with citations.
            </div>
          )}

          {active && (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div
                  style={{
                    maxWidth: "64ch",
                    background: "#fff",
                    border: "1px solid #e3e6ec",
                    borderRadius: 12,
                    borderBottomRightRadius: 4,
                    padding: "12px 15px",
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    boxShadow: "0 1px 2px rgba(20,22,28,0.04)",
                  }}
                >
                  {active.question}
                </div>
              </div>

              {active.status === "loading" && (
                <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
                  <div className="hdp-ai-icon">
                    <span className="hdp-ai-icon-dot" />
                  </div>
                  <span style={{ fontSize: 13, color: "#8a91a0", paddingTop: 6 }}>Retrieving guidance…</span>
                </div>
              )}

              {active.status === "error" && (
                <div style={{ display: "flex", gap: 13, alignItems: "flex-start", maxWidth: "70ch" }}>
                  <div style={{ width: 28, height: 28, flex: "0 0 28px", borderRadius: 8, background: "#eef0f4" }} />
                  <div className="hdp-panel" style={{ padding: "16px 18px" }}>
                    <span style={{ fontSize: 13, color: COLOR.high }}>Couldn't reach the assistant — {active.error}</span>
                  </div>
                </div>
              )}

              {active.status === "success" && active.data && (
                <div style={{ display: "flex", gap: 13, alignItems: "flex-start", maxWidth: "78ch" }}>
                  <div className="hdp-ai-icon" style={{ marginTop: 2 }}>
                    <span className="hdp-ai-icon-dot" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
                    {active.data.escalation_flag && (
                      <div style={{ fontSize: 12.5, color: COLOR.high, fontWeight: 500 }}>
                        ⚠ This question may warrant prompt clinical follow-up.
                      </div>
                    )}
                    <div style={{ fontSize: 14, lineHeight: 1.6 }}>{renderAnswer(active.data.answer)}</div>

                    {!active.data.refused && active.data.citations.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            background: "oklch(0.96 0.02 170)",
                            border: "1px solid oklch(0.88 0.04 170)",
                            borderRadius: 6,
                            padding: "3px 8px",
                            color: "oklch(0.42 0.09 170)",
                          }}
                        >
                          {active.data.citations.length} source{active.data.citations.length === 1 ? "" : "s"} cited
                        </span>
                        <span className="mono" style={{ fontSize: 11, color: "#9aa1b0" }}>
                          retrieval {active.data.citations.map((c) => c.score.toFixed(2)).join(" / ")}
                        </span>
                        <span style={{ fontSize: 11, color: "#9aa1b0" }}>Decision support only — not a treatment recommendation.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ borderTop: "1px solid #e3e6ec", background: "#fff", padding: "14px 24px", display: "flex", flexDirection: "column", gap: 11 }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input, contextPatientId);
            }}
            style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #e3e6ec", borderRadius: 10, padding: "10px 12px" }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={contextPatient ? `Ask about ${contextPatient.name} or the guidelines` : "Ask about the guidelines"}
              style={{ border: 0, outline: 0, background: "transparent", fontSize: 13, flex: 1 }}
            />
            <span className="mono" style={{ fontSize: 10.5, color: "#a8aeba" }}>
              grounded · cited
            </span>
            <button
              type="submit"
              className="hdp__btn hdp__btn--primary"
              style={{ padding: "7px 13px", fontSize: 12 }}
              disabled={!input.trim()}
            >
              Ask
            </button>
          </form>
        </div>
      </div>

      <div style={{ borderLeft: "1px solid #e3e6ec", background: "#fff", display: "flex", flexDirection: "column", gap: 10, padding: "16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", color: "#9aa1b0" }}>EVIDENCE</span>
          <div style={{ flex: 1 }} />
          {active?.data && (
            <span className="mono" style={{ fontSize: 10.5, color: "#a8aeba" }}>
              {active.data.citations.length} retrieved
            </span>
          )}
        </div>
        {!active?.data?.citations.length && <span style={{ fontSize: 11.5, color: "#a8aeba" }}>Citations for the current answer appear here.</span>}
        {active?.data?.citations.map((c, i) => (
          <div key={i} style={{ border: "1px solid #eef0f4", borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span className="mono" style={{ fontSize: 10.5, color: COLOR.primary, border: "1px solid oklch(0.90 0.03 285)", borderRadius: 5, padding: "1px 5px" }}>
                {i + 1}
              </span>
              <span style={{ flex: 1 }} />
              <span className="mono" style={{ fontSize: 10, color: "#a8aeba" }}>
                {c.score.toFixed(2)}
              </span>
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 500, lineHeight: 1.4, wordBreak: "break-word" }}>{c.source}</span>
            <span style={{ fontSize: 10.5, color: "#9aa1b0" }}>p. {c.page}</span>
          </div>
        ))}
        <span style={{ fontSize: 10.5, color: "#b6bcc7", lineHeight: 1.5, paddingTop: 4 }}>
          Retrieved from the indexed guideline corpus. Every claim in the answer links to one of these passages.
        </span>
      </div>
    </div>
  );
}
