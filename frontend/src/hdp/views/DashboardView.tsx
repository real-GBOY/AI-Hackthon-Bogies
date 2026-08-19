import type { ClinicianOut, Patient } from "../../types";
import type { HdpView } from "../types";
import {
  averageConfidence,
  dataGapCount,
  deriveAlerts,
  distribution,
  formatFeatureName,
  latestAssessment,
  panelTrend,
  pct,
  previousRiskCategory,
  priorityQueue,
  riskChangeReasons,
} from "../aggregate";
import { avatarStyle, badgeStyle, bandLabel, COLOR, displayScore, dotStyle, initials, trendChipStyle, trendLabel } from "../theme";
import { neutral, riskBorder, riskText, riskTint } from "../colors";
import "./Views.css";

interface DashboardViewProps {
  patients: Patient[];
  clinician: ClinicianOut | null;
  onOpenPatient: (id: string) => void;
  onNavigate: (view: HdpView) => void;
  onAskFollowUp: (question: string) => void;
}

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const RISK_TIERS = [
  { key: "high" as const, label: "HIGH RISK", sub: "Require immediate review" },
  { key: "moderate" as const, label: "NEEDS ATTENTION", sub: "Monitor closely" },
  { key: "low" as const, label: "STABLE", sub: "No immediate concerns" },
];

export function DashboardView({ patients, clinician, onOpenPatient, onNavigate, onAskFollowUp }: DashboardViewProps) {
  const dist = distribution(patients);
  const highOrHigher = dist.high;
  const trend = panelTrend(patients);
  const priority = priorityQueue(patients, 5);
  const alerts = deriveAlerts(patients).slice(0, 5);
  const gaps = dataGapCount(patients);
  const confidence = averageConfidence(patients);
  const risingCount = patients.filter((p) => p.riskResult.trajectory_direction === "rising").length;
  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
  const doctorLabel = clinician?.name ?? "Doctor";

  const donutBg = (() => {
    const total = dist.total || 1;
    const highDeg = (dist.high / total) * 360;
    const modDeg = (dist.moderate / total) * 360;
    return `conic-gradient(${COLOR.high} 0deg ${highDeg}deg, ${COLOR.moderate} ${highDeg}deg ${highDeg + modDeg}deg, ${COLOR.low} ${highDeg + modDeg}deg 360deg)`;
  })();

  const maxTrendTotal = Math.max(1, ...trend.map((t) => t.low + t.moderate + t.high));
  const trendW = 640;
  const trendH = 180;
  const xFor = (i: number) => (trend.length <= 1 ? 0 : (i / (trend.length - 1)) * trendW);
  const yFor = (v: number) => trendH - (v / maxTrendTotal) * trendH;
  const linePath = (key: "low" | "moderate" | "high") =>
    trend.map((t, i) => `${i ? "L" : "M"}${xFor(i).toFixed(1)},${yFor(t[key]).toFixed(1)}`).join(" ");

  const summary =
    dist.total === 0
      ? "No patients on the panel yet."
      : `${highOrHigher} of ${dist.total} patients (${pct(highOrHigher, dist.total)}) are currently in the high-risk band. ${
          risingCount > 0 ? `${risingCount} ${risingCount === 1 ? "is" : "are"} trending upward.` : "None are actively trending upward."
        }${gaps > 0 ? ` ${gaps} ${gaps === 1 ? "has" : "have"} a flagged data gap and carry wider uncertainty.` : ""}`;

  return (
    <div className="hdp-page">
      <div className="hdp-page-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <h1 className="hdp-h1">Population risk overview</h1>
          <div className="hdp-subtle">Hypertensive disorders of pregnancy · rule-based scorer · {patients.length} assessed</div>
        </div>
      </div>

      <div className="hdp-grid-4">
        <div className="hdp-kpi">
          <div className="hdp-kpi-label">
            <span style={dotStyle(COLOR.primary)} />
            PANEL SIZE
          </div>
          <div className="hdp-kpi-value">
            <span className="num">{dist.total}</span>
          </div>
          <div className="hdp-kpi-sub">active pregnancies</div>
        </div>
        <div className="hdp-kpi">
          <div className="hdp-kpi-label">
            <span style={dotStyle(COLOR.high)} />
            HIGH RISK
          </div>
          <div className="hdp-kpi-value">
            <span className="num">{dist.high}</span>
            <span style={{ fontSize: 12, color: neutral.slateSoft }}>{pct(dist.high, dist.total)}</span>
          </div>
          <div className="hdp-kpi-sub">{risingCount} trending upward</div>
        </div>
        <div className="hdp-kpi">
          <div className="hdp-kpi-label">
            <span style={dotStyle(COLOR.moderate)} />
            AVG CONFIDENCE
          </div>
          <div className="hdp-kpi-value">
            <span className="num">{Math.round(confidence * 100)}%</span>
          </div>
          <div className="hdp-kpi-sub">model self-reported</div>
        </div>
        <div className="hdp-kpi">
          <div className="hdp-kpi-label">
            <span style={dotStyle(neutral.slateFaint)} />
            DATA GAPS
          </div>
          <div className="hdp-kpi-value">
            <span className="num">{gaps}</span>
          </div>
          <div className="hdp-kpi-sub">wider uncertainty in queue</div>
        </div>
      </div>

      <div className="hdp-grid-2" style={{ gridTemplateColumns: "1.85fr 1fr", alignItems: "stretch" }}>
        <div className="hdp-panel">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div className="hdp-panel-title">Panel risk trend</div>
              <div className="hdp-panel-sub">Patients per risk band, by assessment sequence</div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: 14 }}>
              {(["high", "moderate", "low"] as const).map((k) => (
                <span key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: neutral.slate }}>
                  <span style={dotStyle(COLOR[k])} />
                  {k === "high" ? "High" : k === "moderate" ? "Moderate" : "Low"}
                </span>
              ))}
            </div>
          </div>
          {trend.length === 0 ? (
            <div className="hdp-empty">No trajectory data yet.</div>
          ) : (
            <>
              <svg viewBox={`0 0 ${trendW} ${trendH}`} width="100%" height={220} preserveAspectRatio="none" style={{ display: "block" }}>
                <path d={linePath("high")} fill="none" stroke={COLOR.high} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                <path d={linePath("moderate")} fill="none" stroke={COLOR.moderate} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <path
                  d={linePath("low")}
                  fill="none"
                  stroke={COLOR.low}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {trend.map((t) => (
                  <span key={t.label} className="mono" style={{ fontSize: 10.5, color: neutral.slateFaint }}>
                    {t.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="hdp-panel">
          <div>
            <div className="hdp-panel-title">Risk distribution</div>
            <div className="hdp-panel-sub">{dist.total} active pregnancies</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 0" }}>
            <div style={{ width: 168, height: 168, borderRadius: 999, background: donutBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div
                style={{
                  width: 112,
                  height: 112,
                  borderRadius: 999,
                  background: neutral.white,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                }}
              >
                <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.03em" }}>{pct(dist.high, dist.total)}</div>
                <div style={{ fontSize: 10.5, color: neutral.slateSoft, textAlign: "center", lineHeight: 1.3 }}>high risk</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {(["high", "moderate", "low"] as const).map((k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={dotStyle(COLOR[k])} />
                <span style={{ fontSize: 12.5, flex: 1 }}>{k === "high" ? "High" : k === "moderate" ? "Moderate" : "Low"}</span>
                <span className="mono" style={{ fontSize: 12.5, color: neutral.slate }}>
                  {dist[k]}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 500, width: 46, textAlign: "right" }}>{pct(dist[k], dist.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {dist.total > 0 && (
        <div className="hdp-ai-panel">
          <div className="hdp-ai-icon">
            <span className="hdp-ai-icon-dot" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="hdp-ai-eyebrow">PANEL SUMMARY</span>
              <span className="mono" style={{ fontSize: 10.5, color: neutral.slateSofter }}>
                computed from {dist.total} records
              </span>
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: "88ch" }}>{summary}</div>
          </div>
          <button className="hdp__btn" onClick={() => onAskFollowUp("Summarize this week's changes across the panel and who I should review first.")}>
            Ask a follow-up
          </button>
        </div>
      )}

      <div className="hdp-grid-2" style={{ gridTemplateColumns: "1.85fr 1fr", alignItems: "start" }}>
        <div className="hdp-table">
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px 14px" }}>
            <div>
              <div className="hdp-panel-title">Priority queue</div>
              <div className="hdp-panel-sub">Ranked by risk score, then trajectory direction</div>
            </div>
            <div style={{ flex: 1 }} />
            <a
              href="#queue"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("queue");
              }}
              style={{ fontSize: 12, fontWeight: 500 }}
            >
              View all {dist.total}
            </a>
          </div>
          <div className="hdp-table__head" style={{ gridTemplateColumns: "1.6fr 0.9fr 1.5fr 0.8fr" }}>
            <span>PATIENT</span>
            <span>RISK</span>
            <span>LEADING DRIVER</span>
            <span style={{ textAlign: "right" }}>TREND</span>
          </div>
          {queue.length === 0 && <div className="hdp-empty">No patients on the panel yet.</div>}
          {queue.map((p) => {
            const r = p.riskResult;
            const driver = leadingDriver(p);
            return (
              <div
                key={p.id}
                className="hdp-table__row hdp-table__row--click"
                style={{ gridTemplateColumns: "1.6fr 0.9fr 1.5fr 0.8fr" }}
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
                <span style={{ fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {driver ? formatFeatureName(driver) : "—"}
                </span>
                <span style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span style={trendChipStyle(r.trajectory_direction)}>{trendLabel(r.trajectory_direction)}</span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="hdp-table">
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px 12px" }}>
            <div className="hdp-panel-title">Recent alerts</div>
            <div style={{ flex: 1 }} />
            <span className="mono" style={{ fontSize: 10.5, color: neutral.slateSofter }}>
              {alerts.length} open
            </span>
          </div>
          {alerts.length === 0 && <div className="hdp-empty">No alerts raised.</div>}
          {alerts.map((a) => (
            <div key={a.id} style={{ display: "flex", gap: 11, padding: "12px 18px", borderTop: `1px solid ${neutral.rowBorder}`, alignItems: "flex-start" }}>
              <span style={{ ...dotStyle(bandColor(a.category), 7), marginTop: 5 }} />
              <span style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                  <strong style={{ fontWeight: 600 }}>{a.patientName}</strong> — {a.text}
                </span>
              </span>
            </div>
          ))}
          <div style={{ padding: "12px 18px", borderTop: `1px solid ${neutral.rowBorder}` }}>
            <a
              href="#alerts"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("alerts");
              }}
              style={{ fontSize: 12, fontWeight: 500 }}
            >
              Open alert log
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
