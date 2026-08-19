import { useMemo, useState } from "react";
import type { Patient, RiskCategory } from "../../types";
import { formatFeatureName } from "../aggregate";
import { avatarStyle, bandLabel, displayScore, initials, pillStyle, trendChipStyle, trendLabel } from "../theme";
import "./Views.css";

interface PatientsViewProps {
  patients: Patient[];
  query: string;
  onOpenPatient: (id: string) => void;
}

type RiskFilter = "All" | RiskCategory;

const RISK_FILTERS: RiskFilter[] = ["All", "high", "moderate", "low"];

export function PatientsView({ patients, query, onOpenPatient }: PatientsViewProps) {
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) => {
      if (riskFilter !== "All" && p.riskResult.risk_category !== riskFilter) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [patients, riskFilter, query]);

  const counts: Record<RiskFilter, number> = {
    All: patients.length,
    high: patients.filter((p) => p.riskResult.risk_category === "high").length,
    moderate: patients.filter((p) => p.riskResult.risk_category === "moderate").length,
    low: patients.filter((p) => p.riskResult.risk_category === "low").length,
  };

  return (
    <div className="hdp-page">
      <div className="hdp-page-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <h1 className="hdp-h1">Patients</h1>
          <div className="hdp-subtle">
            {filtered.length} of {patients.length} active pregnancies
          </div>
        </div>
      </div>

      <div className="hdp-chip-row">
        {RISK_FILTERS.map((f) => (
          <button
            key={f}
            className={`hdp-chip${riskFilter === f ? " hdp-chip--active" : ""}`}
            onClick={() => setRiskFilter(f)}
          >
            {f === "All" ? "All" : bandLabel(f)}
            <span className="mono" style={{ fontSize: 10.5, opacity: 0.6 }}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      <div className="hdp-table">
        <div className="hdp-table__head" style={{ gridTemplateColumns: "1.7fr 1.1fr 0.9fr 1.7fr 0.9fr 0.55fr" }}>
          <span>PATIENT</span>
          <span>RISK</span>
          <span>TREND</span>
          <span>RISK DRIVERS</span>
          <span>ASSESSED</span>
          <span style={{ textAlign: "right" }}>ACTIONS</span>
        </div>
        {filtered.length === 0 && <div className="hdp-empty">No patients match this filter.</div>}
        {filtered.map((p) => {
          const r = p.riskResult;
          const drivers = [...r.drivers].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 2);
          return (
            <div key={p.id} className="hdp-table__row" style={{ gridTemplateColumns: "1.7fr 1.1fr 0.9fr 1.7fr 0.9fr 0.55fr" }}>
              <div className="hdp-avatar-cell">
                <span style={avatarStyle(r.risk_category)}>{initials(p.name)}</span>
                <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                  <span className="name">{p.name}</span>
                  <span className="mrn mono">
                    {p.id} · {p.age}y
                  </span>
                </span>
              </div>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={pillStyle(r.risk_category)}>{displayScore(r.risk_score)}</span>
                <span style={{ fontSize: 11.5, color: "#666d7d" }}>{bandLabel(r.risk_category)}</span>
              </span>
              <span>
                <span style={trendChipStyle(r.trajectory_direction)}>{trendLabel(r.trajectory_direction)}</span>
              </span>
              <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {drivers.length === 0 && <span style={{ fontSize: 11, color: "#a8aeba" }}>None recorded</span>}
                {drivers.map((d) => (
                  <span
                    key={d.feature}
                    style={{ fontSize: 10.5, background: "#f4f5f8", border: "1px solid #e9ebf0", borderRadius: 5, padding: "2px 6px", color: "#4a5160", whiteSpace: "nowrap" }}
                  >
                    {formatFeatureName(d.feature)}
                  </span>
                ))}
              </span>
              <span style={{ fontSize: 12, color: "#666d7d" }}>{new Date(r.assessment_time).toLocaleDateString()}</span>
              <span style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="hdp__btn"
                  style={{ padding: "4px 8px", fontSize: 11 }}
                  onClick={() => onOpenPatient(p.id)}
                >
                  Open
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
