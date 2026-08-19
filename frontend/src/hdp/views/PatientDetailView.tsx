import { useMemo, useState } from "react";
import type { Patient } from "../../types";
import { assessmentLabel, formatFeatureName } from "../aggregate";
import { avatarStyle, badgeStyle, bandColor, bandLabel, COLOR, displayScore, dotStyle, initials, trendChipStyle, trendLabel } from "../theme";
import { neutral, primary, riskAreaFill, riskZoneFill } from "../colors";
import { RISK_HIGH_BOUNDARY, RISK_LOW_BOUNDARY, categorizeRisk } from "../../lib/risk";
import "./Views.css";

type Tab = "overview" | "trajectory" | "drivers" | "timeline";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "trajectory", label: "Risk trajectory" },
  { key: "drivers", label: "Risk drivers" },
  { key: "timeline", label: "Timeline" },
];

const CW = 720;
const CH = 220;

interface PatientDetailViewProps {
  patient: Patient;
  onBack: () => void;
  onAskAboutPatient: (patientId: string, question: string) => void;
}

export function PatientDetailView({ patient, onBack, onAskAboutPatient }: PatientDetailViewProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [openDriver, setOpenDriver] = useState(0);

  const r = patient.riskResult;
  const traj = r.trajectory;
  const n = traj.length;
  const score = displayScore(r.risk_score);

  const points = useMemo(
    () =>
      traj.map((t, i) => ({
        x: n <= 1 ? 0 : (i / (n - 1)) * CW,
        y: CH - (t.risk * CH),
        score: Math.round(t.risk * 100),
        label: assessmentLabel(t.time, i),
      })),
    [traj, n],
  );

  const path = points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = path ? `${path} L${CW},${CH} L0,${CH} Z` : "";

  const zoneY = (bound: number) => CH - bound * CH;
  const zones = [
    { y: 0, h: zoneY(RISK_HIGH_BOUNDARY), label: "High", fill: riskZoneFill("high") },
    { y: zoneY(RISK_HIGH_BOUNDARY), h: zoneY(RISK_LOW_BOUNDARY) - zoneY(RISK_HIGH_BOUNDARY), label: "Moderate", fill: riskZoneFill("moderate") },
    { y: zoneY(RISK_LOW_BOUNDARY), h: CH - zoneY(RISK_LOW_BOUNDARY), label: "Low", fill: neutral.surfaceFaintest },
  ];

  const sortedDrivers = useMemo(() => [...r.drivers].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)), [r.drivers]);
  const maxAbsImpact = Math.max(...sortedDrivers.map((d) => Math.abs(d.impact)), 0.01);
  const driverDetail = (feature: string) => r.driver_details?.find((d) => d.feature === feature) ?? null;

  const changes = useMemo(() => {
    const out: { text: string; index: number }[] = [];
    for (let i = 1; i < traj.length; i++) {
      const prevCat = categorizeRisk(traj[i - 1].risk);
      const curCat = categorizeRisk(traj[i].risk);
      const deltaPts = Math.round((traj[i].risk - traj[i - 1].risk) * 100);
      if (curCat !== prevCat) {
        out.push({ text: `Risk band moved ${bandLabel(prevCat)} → ${bandLabel(curCat)} (${deltaPts >= 0 ? "+" : ""}${deltaPts} pts)`, index: i });
      } else if (Math.abs(deltaPts) >= 8) {
        out.push({ text: `Score moved ${deltaPts >= 0 ? "up" : "down"} ${Math.abs(deltaPts)} pts within ${bandLabel(curCat)}`, index: i });
      }
    }
    return out.reverse();
  }, [traj]);

  const topDriver = sortedDrivers[0];
  const selIdx = selectedIndex ?? n - 1;
  const sel = points[selIdx];
  const prevSel = points[selIdx - 1];

  const followUpCadence =
    r.risk_category === "high" ? "Weekly review, twice-weekly BP monitoring" : r.risk_category === "moderate" ? "Review at next scheduled visit, weekly BP monitoring" : "Routine antenatal schedule";

  const chart = (height: number, interactive: boolean) => (
    <div style={{ position: "relative", height }}>
      <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: "block" }}>
        {zones.map((z) => (
          <rect key={z.label} x={0} width={CW} y={z.y} height={Math.max(0, z.h)} fill={z.fill} />
        ))}
        <path d={area} fill={riskAreaFill(r.risk_category)} stroke="none" />
        <path d={path} fill="none" stroke={bandColor(r.risk_category)} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === selIdx && interactive ? 5.5 : 3.4}
            fill={i === n - 1 ? bandColor(r.risk_category) : neutral.white}
            stroke={bandColor(categorizeRisk(traj[i].risk))}
            strokeWidth={2}
            style={interactive ? { cursor: "pointer" } : undefined}
            onClick={interactive ? () => setSelectedIndex(i) : undefined}
          />
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4 }}>
        {points.map((p) => (
          <span key={p.label} className="mono" style={{ fontSize: 10.5, color: neutral.slateFaint }}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="hdp-page">
      <a
        href="#patients"
        onClick={(e) => {
          e.preventDefault();
          onBack();
        }}
        style={{ fontSize: 12, fontWeight: 500 }}
      >
        ← All patients
      </a>

      <div className="hdp-panel" style={{ flexDirection: "row", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <span style={avatarStyle(r.risk_category, 46)}>{initials(patient.name)}</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em" }}>{patient.name}</h1>
            <span style={badgeStyle(r.risk_category)}>{bandLabel(r.risk_category)} risk</span>
          </div>
          <div className="mono" style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11.5, color: neutral.slateSoft }}>
            <span>{patient.id}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{patient.age}y</span>
          </div>
        </div>
        <div style={{ width: 1, height: 44, background: neutral.borderSoft }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", color: neutral.slateSofter }}>CURRENT RISK</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span style={{ fontSize: 38, fontWeight: 600, letterSpacing: "-0.03em", color: bandColor(r.risk_category) }}>{score}</span>
            <span style={{ fontSize: 12, color: neutral.slateSofter }}>/ 100</span>
            <span style={trendChipStyle(r.trajectory_direction)}>{trendLabel(r.trajectory_direction)}</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {r.uncertainty.flag && (
          <span style={{ fontSize: 11, color: neutral.slateSoft, maxWidth: 220 }}>⚠ {r.uncertainty.reason}</span>
        )}
      </div>

      <div className="hdp-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`hdp-tab${tab === t.key ? " hdp-tab--active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="hdp-grid-2" style={{ gridTemplateColumns: "1.8fr 1fr", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="hdp-panel">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div className="hdp-panel-title">Risk across this pregnancy</div>
                  <div className="hdp-panel-sub">Predicted risk at each assessment, with risk zones</div>
                </div>
                <div style={{ flex: 1 }} />
                <a
                  href="#trajectory"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab("trajectory");
                  }}
                  style={{ fontSize: 12, fontWeight: 500 }}
                >
                  Full trajectory
                </a>
              </div>
              {n === 0 ? <div className="hdp-empty">No assessments recorded yet.</div> : chart(200, false)}
            </div>

            <div className="hdp-panel">
              <div className="hdp-panel-title">Risk drivers</div>
              <div className="hdp-panel-sub">{topDriver ? `Leading contribution: ${formatFeatureName(topDriver.feature)}` : "No active risk drivers recorded"}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {sortedDrivers.slice(0, 3).map((d, i) => (
                  <div key={d.feature} className="hdp-driver-row">
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span className="mono" style={{ fontSize: 10.5, color: neutral.slateGhost }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span style={{ fontSize: 12.5, flex: 1 }}>{formatFeatureName(d.feature)}</span>
                      <span className="mono" style={{ fontSize: 11.5, color: neutral.slateSoft }}>
                        {(Math.abs(d.impact) / maxAbsImpact * 100).toFixed(0)}%
                      </span>
                    </div>
                    <span className="hdp-bar-track">
                      <span
                        className="hdp-bar-fill"
                        style={{ width: `${(Math.abs(d.impact) / maxAbsImpact) * 100}%`, background: d.impact >= 0 ? bandColor(r.risk_category) : COLOR.low }}
                      />
                    </span>
                  </div>
                ))}
              </div>
              <a
                href="#drivers"
                onClick={(e) => {
                  e.preventDefault();
                  setTab("drivers");
                }}
                style={{ fontSize: 12, fontWeight: 500 }}
              >
                Open full explanation
              </a>
            </div>

            <div className="hdp-panel">
              <div className="hdp-panel-title">Recent changes</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {changes.length === 0 && <span style={{ fontSize: 12.5, color: neutral.slateSofter }}>No material change between assessments.</span>}
                {changes.map((c) => (
                  <div key={c.index} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>{c.text}</span>
                    <span className="mono" style={{ fontSize: 10.5, color: neutral.slateSofter }}>
                      {assessmentLabel(traj[c.index].time, c.index)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="hdp-ai-panel hdp-ai-panel--tight">
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div className="hdp-ai-icon hdp-ai-icon--sm">
                  <span className="hdp-ai-icon-dot" />
                </div>
                <span className="hdp-ai-eyebrow">WHY THIS SCORE</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                {topDriver
                  ? `${formatFeatureName(topDriver.feature)} is the leading contributor, placing this patient in the ${bandLabel(r.risk_category)} band. The trajectory is currently ${r.trajectory_direction}.`
                  : `No dominant driver recorded. Risk is currently ${bandLabel(r.risk_category)} and ${r.trajectory_direction}.`}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="hdp__btn"
                  style={{ padding: "6px 10px", fontSize: 11.5 }}
                  onClick={() => onAskAboutPatient(patient.id, `Why is ${patient.name} (${patient.id}) currently ${bandLabel(r.risk_category)} risk, and what does the guidance recommend?`)}
                >
                  Ask about this patient
                </button>
              </div>
            </div>

            <div className="hdp-panel">
              <div className="hdp-panel-title">Timeline</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[...points].reverse().map((p, revI) => {
                  const i = n - 1 - revI;
                  return (
                    <div key={i} style={{ display: "flex", gap: 11, paddingBottom: 14, borderLeft: `1px solid ${neutral.borderSoft}`, marginLeft: 4, paddingLeft: 14, position: "relative" }}>
                      <span
                        style={{
                          position: "absolute",
                          left: -9,
                          top: 2,
                          ...dotStyle(i === n - 1 ? bandColor(r.risk_category) : neutral.white, 9),
                          border: `2px solid ${bandColor(categorizeRisk(traj[i].risk))}`,
                        }}
                      />
                      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{i === n - 1 ? "Current assessment" : "Prior assessment"}</span>
                        <span style={{ fontSize: 11, color: neutral.slateSoft }}>
                          {p.label} · score {p.score} ({bandLabel(categorizeRisk(traj[i].risk))})
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hdp-panel">
              <div className="hdp-panel-title">Alerts</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {!r.uncertainty.flag && r.trajectory_direction !== "rising" && <span style={{ fontSize: 12.5, color: neutral.slateSofter }}>No active alerts.</span>}
                {r.uncertainty.flag && (
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ ...dotStyle(COLOR.moderate, 7), marginTop: 5 }} />
                    <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>{r.uncertainty.reason}</span>
                  </div>
                )}
                {r.trajectory_direction === "rising" && r.risk_category !== "low" && (
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ ...dotStyle(COLOR.high, 7), marginTop: 5 }} />
                    <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>Risk trending upward across recent assessments.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="hdp-panel">
              <div className="hdp-panel-title">Follow-up</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", color: neutral.slateSofter }}>SUGGESTED CADENCE</span>
                  <span style={{ fontSize: 12.5 }}>{followUpCadence}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", color: neutral.slateSofter }}>CONFIDENCE</span>
                  <span style={{ fontSize: 12.5 }}>{Math.round(r.confidence * 100)}% model self-reported</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "trajectory" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="hdp-panel">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>Risk trajectory</div>
                <div style={{ fontSize: 12, color: neutral.slateSoft }}>Every assessment recorded for this patient. Click a point to inspect it.</div>
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {(["high", "moderate", "low"] as const).map((k) => (
                  <span key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: neutral.slate }}>
                    <span style={dotStyle(COLOR[k])} />
                    {bandLabel(k)}
                  </span>
                ))}
              </div>
            </div>
            {n === 0 ? <div className="hdp-empty">No assessments recorded yet.</div> : chart(300, true)}
          </div>

          {n > 0 && (
            <div className="hdp-grid-2" style={{ gridTemplateColumns: "1fr 1.5fr", alignItems: "start" }}>
              <div className="hdp-panel">
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", color: neutral.slateSofter }}>SELECTED</span>
                  <span className="mono" style={{ fontSize: 12 }}>{sel.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22, fontWeight: 600, color: bandColor(categorizeRisk(traj[selIdx].risk)) }}>{sel.score}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{bandLabel(categorizeRisk(traj[selIdx].risk))}</span>
                </div>
              </div>
              <div className="hdp-panel">
                <div className="hdp-panel-title">What changed</div>
                {prevSel ? (
                  <span style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                    {sel.score - prevSel.score >= 0 ? "Up" : "Down"} {Math.abs(sel.score - prevSel.score)} pts from {prevSel.label} ({prevSel.score} →{" "}
                    {sel.score}).
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: neutral.slateSofter }}>First recorded assessment — no prior point to compare.</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "drivers" && (
        <div className="hdp-grid-2" style={{ gridTemplateColumns: "1.6fr 1fr", alignItems: "start" }}>
          <div className="hdp-panel">
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em" }}>Why is risk what it is?</div>
              <div style={{ fontSize: 12, color: neutral.slateSoft }}>Ranked contribution to the current score. Select a driver for its evidence.</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sortedDrivers.length === 0 && <div className="hdp-empty">No drivers recorded for this assessment.</div>}
              {sortedDrivers.map((d, i) => {
                const open = openDriver === i;
                const detail = driverDetail(d.feature);
                return (
                  <div
                    key={d.feature}
                    onClick={() => setOpenDriver(open ? -1 : i)}
                    style={{
                      border: `1px solid ${open ? primary.borderStrong : neutral.borderSoft}`,
                      background: open ? primary.tintSoft : neutral.white,
                      borderRadius: 10,
                      padding: "14px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 9,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="mono" style={{ fontSize: 11, color: neutral.slateGhost }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 500, flex: 1 }}>{formatFeatureName(d.feature)}</span>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
                        {(Math.abs(d.impact) / maxAbsImpact * 100).toFixed(0)}%
                      </span>
                    </div>
                    <span className="hdp-bar-track" style={{ height: 8 }}>
                      <span
                        className="hdp-bar-fill"
                        style={{ width: `${(Math.abs(d.impact) / maxAbsImpact) * 100}%`, background: d.impact >= 0 ? bandColor(r.risk_category) : COLOR.low }}
                      />
                    </span>
                    {open && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 9, borderTop: `1px solid ${neutral.borderSoft}` }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", color: neutral.slateSofter }}>EVIDENCE</span>
                          <span style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                            {detail?.description ?? `Impact ${d.impact.toFixed(2)} on the model's weighted score.`}
                          </span>
                        </div>
                        {detail?.source && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", color: neutral.slateSofter }}>SOURCE</span>
                            <span className="mono" style={{ fontSize: 11.5, lineHeight: 1.5, color: neutral.slate }}>
                              {detail.source}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="hdp-ai-panel hdp-ai-panel--tight">
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div className="hdp-ai-icon hdp-ai-icon--sm">
                  <span className="hdp-ai-icon-dot" />
                </div>
                <span className="hdp-ai-eyebrow">PLAIN-LANGUAGE SUMMARY</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                {topDriver
                  ? `${formatFeatureName(topDriver.feature)} accounts for the largest share of this score. Every weight is traceable to a specific guideline passage — see Source under each driver.`
                  : "No drivers are currently contributing to this score."}
              </div>
              <span className="mono" style={{ fontSize: 10.5, color: neutral.slateSofter }}>
                Rule-based scorer output, clinician review required
              </span>
            </div>
          </div>
        </div>
      )}

      {tab === "timeline" && (
        <div className="hdp-panel">
          {n === 0 && <div className="hdp-empty">No assessments recorded yet.</div>}
          <div style={{ display: "flex", flexDirection: "column", borderLeft: `1px solid ${neutral.borderSoft}`, paddingLeft: 22, marginLeft: 5 }}>
            {[...points].reverse().map((p, revI) => {
              const i = n - 1 - revI;
              const prev = points[i - 1];
              const cat = categorizeRisk(traj[i].risk);
              return (
                <div key={i} style={{ position: "relative", paddingBottom: 20, display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span style={{ position: "absolute", left: -27, top: 3, ...dotStyle(bandColor(cat), 9) }} />
                  <span className="mono" style={{ fontSize: 11.5, color: neutral.slateSoft, width: 34, flex: "0 0 34px", paddingTop: 1 }}>
                    {p.label}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Score {p.score}</span>
                      <span style={badgeStyle(cat)}>{bandLabel(cat)}</span>
                    </span>
                    <span style={{ fontSize: 12, color: neutral.slate, lineHeight: 1.5 }}>
                      {prev ? `${p.score - prev.score >= 0 ? "+" : ""}${p.score - prev.score} pts since ${prev.label}` : "First recorded assessment"}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
