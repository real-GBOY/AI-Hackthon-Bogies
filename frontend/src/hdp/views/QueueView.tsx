import type { Patient, RiskCategory } from "../../types";
import { formatFeatureName, leadingDriver } from "../aggregate";
import { avatarStyle, bandColor, displayScore, dotStyle, initials, pillStyle, trendChipStyle, trendLabel } from "../theme";
import { neutral } from "../colors";
import "./Views.css";

interface QueueViewProps {
  patients: Patient[];
  onOpenPatient: (id: string) => void;
}

const GROUPS: { category: RiskCategory; label: string; sub: string }[] = [
  { category: "high", label: "High risk", sub: "Review first" },
  { category: "moderate", label: "Moderate risk", sub: "Review this week" },
  { category: "low", label: "Low risk", sub: "Routine schedule" },
];

function reason(p: Patient): string {
  const r = p.riskResult;
  const driver = leadingDriver(p);
  const parts: string[] = [];
  if (driver) parts.push(formatFeatureName(driver));
  if (r.trajectory_direction === "rising") parts.push("trending upward");
  if (r.uncertainty.flag) parts.push(r.uncertainty.reason ?? "uncertain score");
  return parts.length > 0 ? parts.join(" · ") : "Stable, no active drivers";
}

export function QueueView({ patients, onOpenPatient }: QueueViewProps) {
  return (
    <div className="hdp-page">
      <div className="hdp-page-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <h1 className="hdp-h1">Review queue</h1>
          <div className="hdp-subtle">Who to review first, and why. Ordering is decision support — escalation stays with the clinician.</div>
        </div>
      </div>

      {GROUPS.map((g) => {
        const rows = patients
          .filter((p) => p.riskResult.risk_category === g.category)
          .sort((a, b) => b.riskResult.risk_score - a.riskResult.risk_score);
        if (rows.length === 0) return null;
        return (
          <div key={g.category} className="hdp-table">
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px" }}>
              <span style={dotStyle(bandColor(g.category))} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{g.label}</span>
              <span className="mono" style={{ fontSize: 10.5, color: neutral.slateSoft }}>
                {rows.length}
              </span>
              <span style={{ fontSize: 11.5, color: neutral.slate }}>{g.sub}</span>
            </div>
            <div className="hdp-table__head" style={{ gridTemplateColumns: "1.5fr 0.8fr 0.7fr 2fr 1fr" }}>
              <span>PATIENT</span>
              <span>RISK</span>
              <span>TREND</span>
              <span>REASON FOR PRIORITY</span>
              <span style={{ textAlign: "right" }}>ASSESSED</span>
            </div>
            {rows.map((p) => {
              const r = p.riskResult;
              return (
                <div
                  key={p.id}
                  className="hdp-table__row hdp-table__row--click"
                  style={{ gridTemplateColumns: "1.5fr 0.8fr 0.7fr 2fr 1fr" }}
                  onClick={() => onOpenPatient(p.id)}
                >
                  <div className="hdp-avatar-cell">
                    <span style={avatarStyle(r.risk_category)}>{initials(p.name)}</span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                      <span className="name">{p.name}</span>
                      <span className="mrn mono">{p.id}</span>
                    </span>
                  </div>
                  <span>
                    <span style={pillStyle(r.risk_category)}>{displayScore(r.risk_score)}</span>
                  </span>
                  <span>
                    <span style={trendChipStyle(r.trajectory_direction)}>{trendLabel(r.trajectory_direction)}</span>
                  </span>
                  <span style={{ fontSize: 12, color: neutral.slate, lineHeight: 1.45 }}>{reason(p)}</span>
                  <span style={{ fontSize: 11.5, color: neutral.slateSoft, textAlign: "right" }}>
                    {new Date(r.assessment_time).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}

      {patients.length === 0 && (
        <div className="hdp-table">
          <div className="hdp-empty">No patients on the panel yet.</div>
        </div>
      )}
    </div>
  );
}
