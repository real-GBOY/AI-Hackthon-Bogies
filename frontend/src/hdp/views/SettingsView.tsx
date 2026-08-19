import { RISK_HIGH_BOUNDARY, RISK_LOW_BOUNDARY, TREND_STABLE_BAND, UNCERTAINTY_MARGIN } from "../../lib/risk";
import { ML_SERVICE_URL, RAG_TIMEOUT_MS } from "../../api/config";
import type { ServiceHealthStatus } from "../../hooks/useServiceHealthCheck";
import { neutral, positiveText } from "../colors";
import "./Views.css";

interface Row {
  k: string;
  v: string;
}

interface Group {
  label: string;
  rows: Row[];
}

const GROUPS: Group[] = [
  {
    label: "Risk scorer",
    rows: [
      { k: "Model type", v: "Guideline-grounded rule engine" },
      { k: "Low / moderate boundary", v: RISK_LOW_BOUNDARY.toFixed(2) },
      { k: "Moderate / high boundary", v: RISK_HIGH_BOUNDARY.toFixed(2) },
      { k: "Uncertainty margin", v: `± ${UNCERTAINTY_MARGIN.toFixed(2)}` },
      { k: "Stable-trend band", v: `± ${TREND_STABLE_BAND.toFixed(2)}` },
    ],
  },
  {
    label: "Retrieval & assistant",
    rows: [
      { k: "Retrieval top-k", v: "5 chunks" },
      { k: "Request timeout", v: `${RAG_TIMEOUT_MS / 1000}s` },
      { k: "Modes supported", v: "Clinician, Patient" },
      { k: "Grounding", v: "Answers only from retrieved guideline text" },
    ],
  },
  {
    label: "Account",
    rows: [
      { k: "Signed in as", v: "Dr. Rachel Okonjo" },
      { k: "Role", v: "Maternal-Fetal Medicine" },
      { k: "Panel", v: "Mercy Women's Health" },
    ],
  },
  {
    label: "Backend",
    rows: [
      { k: "ML service", v: ML_SERVICE_URL },
      { k: "Endpoints", v: "/predict, /rag/query" },
    ],
  },
];

interface SettingsViewProps {
  liveStatus: ServiceHealthStatus;
  liveError: string | null;
  onCheckLive: () => void;
}

export function SettingsView({ liveStatus, liveError, onCheckLive }: SettingsViewProps) {
  return (
    <div className="hdp-page" style={{ maxWidth: 920 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <h1 className="hdp-h1">Model &amp; settings</h1>
        <div className="hdp-subtle">Reference values the scorer and retrieval layer actually run against — not user-editable yet.</div>
      </div>

      <div className="hdp-panel" style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <button className="hdp__btn" onClick={onCheckLive} disabled={liveStatus === "loading"}>
          {liveStatus === "loading" ? "Checking…" : "Check live ML service"}
        </button>
        {liveStatus === "success" && <span style={{ fontSize: 12, color: positiveText }}>ML service reachable</span>}
        {liveStatus === "error" && (
          <span style={{ fontSize: 12, color: neutral.slateSoft }} title={liveError ?? undefined}>
            Mock mode · {liveError}
          </span>
        )}
      </div>

      <div className="hdp-grid-2">
        {GROUPS.map((g) => (
          <div key={g.label} className="hdp-table">
            <div style={{ padding: "13px 18px", borderBottom: `1px solid ${neutral.borderSoft}`, fontSize: 13.5, fontWeight: 600 }}>{g.label}</div>
            {g.rows.map((r) => (
              <div key={r.k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: `1px solid ${neutral.rowBorder}` }}>
                <span style={{ fontSize: 12.5, color: neutral.slate, flex: 1 }}>{r.k}</span>
                <span className="mono" style={{ fontSize: 12.5, fontWeight: 500, textAlign: "right", wordBreak: "break-word" }}>
                  {r.v}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
