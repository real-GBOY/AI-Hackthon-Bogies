import type { ClinicianOut, Patient } from "../../types";
import type { HdpView } from "../types";
import {
  averageConfidence,
  buildClinicalQuestion,
  dataGapCount,
  deriveAlerts,
  distribution,
  latestAssessment,
  panelTrend,
  pct,
  previousRiskCategory,
  priorityQueue,
  riskChangeReasons,
} from "../aggregate";
import { avatarStyle, badgeStyle, bandColor, bandLabel, COLOR, dotStyle, initials, trendChipStyle, trendLabel } from "../theme";
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
      <div className="hdp-welcome">
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 className="hdp-welcome-greeting">
            {greetingForHour(now.getHours())}, {doctorLabel}
          </h1>
          <div className="hdp-welcome-sub">
            You are currently monitoring {dist.total} patient{dist.total === 1 ? "" : "s"} · {dateLabel}
          </div>
        </div>
        <span className="hdp-live-pill">
          <span className="hdp-ai-icon-dot" style={{ background: "currentColor" }} />
          AI monitoring active
        </span>
      </div>

      <div className="hdp-risk-tier-grid">
        {RISK_TIERS.map((tier) => (
          <div
            key={tier.key}
            className="hdp-risk-tier"
            style={{ background: riskTint(tier.key), borderColor: riskBorder(tier.key) }}
          >
            <div className="hdp-risk-tier-head">
              <span style={dotStyle(COLOR[tier.key], 9)} />
              <span className="hdp-risk-tier-label" style={{ color: riskText(tier.key) }}>
                {tier.label}
              </span>
            </div>
            <div className="hdp-risk-tier-count" style={{ color: riskText(tier.key) }}>
              {dist[tier.key]} <span style={{ fontSize: 14, fontWeight: 500 }}>patient{dist[tier.key] === 1 ? "" : "s"}</span>
            </div>
            <div className="hdp-risk-tier-sub">{tier.sub}</div>
          </div>
        ))}
      </div>

      <div className="hdp-page-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div className="hdp-panel-title">Priority Patients</div>
          <div className="hdp-panel-sub">Patients prioritized by AI based on current risk, recent changes, and clinical indicators.</div>
        </div>
      </div>

      <div className="hdp-priority-list">
        {priority.length === 0 && <div className="hdp-empty">No patients on the panel yet.</div>}
        {priority.map((p) => {
          const r = p.riskResult;
          const week = latestAssessment(p)?.features.gestational_week as number | undefined;
          const reasons = riskChangeReasons(p);
          const prevCategory = previousRiskCategory(p);
          return (
            <div key={p.id} className="hdp-priority-card">
              <span style={avatarStyle(r.risk_category, 42)}>{initials(p.name)}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: "1 1 260px", minWidth: 220 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</div>
                  {week != null && <div style={{ fontSize: 12, color: neutral.slateSoft }}>{week} weeks pregnant</div>}
                </div>
                <span style={{ ...badgeStyle(r.risk_category), alignSelf: "flex-start" }}>{bandLabel(r.risk_category)} risk</span>
                {reasons.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", color: neutral.slateSofter, marginBottom: 4 }}>WHY?</div>
                    <ul className="hdp-priority-card-why">
                      {reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {prevCategory && prevCategory !== r.risk_category && (
                  <div className="hdp-priority-card-change">
                    Risk changed: {bandLabel(prevCategory)} → {bandLabel(r.risk_category)}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, marginLeft: "auto" }}>
                <span style={trendChipStyle(r.trajectory_direction)}>{trendLabel(r.trajectory_direction)}</span>
                <button className="hdp__btn" onClick={() => onOpenPatient(p.id)}>
                  Review Patient →
                </button>
              </div>
            </div>
          );
        })}
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
          <button
            className="hdp__btn"
            disabled={priority.length === 0}
            onClick={() => priority[0] && onAskFollowUp(buildClinicalQuestion(priority[0]))}
          >
            {priority[0] ? `Ask about ${priority[0].name}` : "Ask a follow-up"}
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
