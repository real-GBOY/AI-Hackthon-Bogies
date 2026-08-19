import { useState } from "react";
import { RiskCard } from "./RiskCard";
import { TrajectoryChart } from "./TrajectoryChart";
import { DriversList } from "./DriversList";
import {
  demoAdaptiveFollowUp,
  demoAssessments,
  demoPatient,
  sourceFullNames,
  whyRiskChanged,
} from "../mock/demoJourney";
import { useRagQuery } from "../hooks/useRagQuery";
import "./PatientJourney.css";

// Same clinical scenario whyRiskChanged.answer was captured from (see
// mock/demoJourney.ts's docstring) — asking it live re-runs the identical
// question through the real pipeline instead of replaying the baked output.
const LIVE_QUESTION =
  "A patient at 30 weeks gestation has blood pressure 165/95 with a new severe headache and blurred " +
  "vision, after having a normal blood pressure of 118/76 at week 24. Why does this indicate increased " +
  "risk and what should happen next?";

function formatFeatureName(feature: string): string {
  return feature
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function renderAnswerWithCitations(answer: string) {
  const parts = answer.split(/(\[[^[\]]+\])/g);
  return parts.map((part, i) => {
    const match = /^\[([^\]]+)\]$/.exec(part);
    if (!match) return <span key={i}>{part}</span>;
    return (
      <span key={i} className="journey-cite" title={sourceFullNames[match[1].split(" p.")[0]] ?? undefined}>
        [{match[1]}]
      </span>
    );
  });
}

export function PatientJourney() {
  const [revealed, setRevealed] = useState(false);
  const [source, setSource] = useState<"captured" | "live">("captured");
  const { status: liveState, data: liveResult, error: liveError, ask } = useRagQuery();
  const latest = demoAssessments[demoAssessments.length - 1];
  const baseline = demoAssessments[0];

  async function handleSelectSource(next: "captured" | "live") {
    setSource(next);
    if (next === "live" && liveState === "idle") {
      await ask(LIVE_QUESTION, "clinician");
    }
  }

  return (
    <div className="journey">
      <section className="journey-block journey-profile">
        <h2 className="journey-block__title">Patient profile</h2>
        <p className="journey-profile__text">
          {demoPatient.age}-year-old, first pregnancy, {latest.week} weeks gestation. Blood pressure had been
          normal throughout — {baseline.systolic}/{baseline.diastolic} mmHg at week {baseline.week}, no
          symptoms.
        </p>
      </section>

      <section className="journey-block journey-report">
        <h2 className="journey-block__title">Today's report</h2>
        <p className="journey-report__alert">
          "I have a really bad headache and my vision keeps going blurry." Blood pressure on arrival:{" "}
          <strong>
            {latest.systolic}/{latest.diastolic} mmHg
          </strong>
          .
        </p>
        <div className="journey-followup">
          <p className="journey-followup__label">Adaptive follow-up</p>
          {demoAdaptiveFollowUp.map((qa) => (
            <div className="journey-followup__row" key={qa.question}>
              <span className="journey-followup__q">{qa.question}</span>
              <span className="journey-followup__a">{qa.answer}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="journey-block">
        <h2 className="journey-block__title">Risk trajectory</h2>
        <div className="journey-risk-grid">
          <RiskCard
            riskResult={demoPatient.riskResult}
            subtitle={`${demoPatient.name} · ${demoPatient.age}y · ${demoPatient.id}`}
          />
          <TrajectoryChart trajectory={demoPatient.riskResult.trajectory} />
        </div>
        <DriversList drivers={demoPatient.riskResult.drivers} />
      </section>

      <section className="journey-block journey-why">
        <h2 className="journey-block__title">"Why did my risk change?"</h2>
        {!revealed ? (
          <button className="journey-reveal-button" onClick={() => setRevealed(true)}>
            Show explanation
          </button>
        ) : (
          <div className="journey-answer">
            <div className="journey-source-switch">
              <button
                className={`journey-source-tab${source === "captured" ? " journey-source-tab--active" : ""}`}
                onClick={() => handleSelectSource("captured")}
              >
                Captured (safe)
              </button>
              <button
                className={`journey-source-tab${source === "live" ? " journey-source-tab--active" : ""}`}
                onClick={() => handleSelectSource("live")}
              >
                Live (calls the real backend)
              </button>
            </div>

            {source === "captured" && (
              <>
                <p className="journey-answer__text">{renderAnswerWithCitations(whyRiskChanged.answer)}</p>
                <p className="journey-answer__note">
                  Real output from <code>generate.py</code>, grounded in the retrieved guideline passages
                  below — captured once and baked in for demo reliability (Groq's free-tier rate limits
                  make a live call during judging risky).
                </p>
                <div className="journey-retrieved">
                  <p className="journey-retrieved__label">Retrieved passages</p>
                  <ul className="journey-retrieved__list">
                    {whyRiskChanged.retrieved.map((r, i) => (
                      <li key={i}>
                        <span className="journey-retrieved__src">
                          {r.source} p.{r.page}
                        </span>
                        <span className="journey-retrieved__score">{r.score.toFixed(3)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {source === "live" && (
              <>
                {liveState === "loading" && <p className="journey-answer__note">Calling the live RAG pipeline…</p>}
                {liveState === "error" && (
                  <p className="journey-answer__note journey-answer__note--error">
                    Live call failed ({liveError}) — falling back to the captured answer is recommended for
                    a live demo.
                  </p>
                )}
                {liveState === "success" && liveResult && (
                  <>
                    <p className="journey-answer__text">{renderAnswerWithCitations(liveResult.answer)}</p>
                    <p className="journey-answer__note">
                      Live output, just now, from the running <code>/rag/query</code> backend — same
                      pipeline, called fresh instead of replayed.
                    </p>
                    <div className="journey-retrieved">
                      <p className="journey-retrieved__label">Retrieved passages</p>
                      <ul className="journey-retrieved__list">
                        {liveResult.citations.map((c, i) => (
                          <li key={i}>
                            <span className="journey-retrieved__src">
                              {c.source} p.{c.page}
                            </span>
                            <span className="journey-retrieved__score">{c.score.toFixed(3)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <section className="journey-block journey-doctor">
        <h2 className="journey-block__title">Doctor summary</h2>
        <p className="journey-doctor__text">
          {demoPatient.name} ({demoPatient.age}y, {latest.week} weeks): BP rose from {baseline.systolic}/
          {baseline.diastolic} at week {baseline.week} to {latest.systolic}/{latest.diastolic} today, crossing
          the severe-range threshold, with new headache and visual disturbance. Risk category is now{" "}
          <strong>{demoPatient.riskResult.risk_category}</strong> ({demoPatient.riskResult.trajectory_direction}
          ). Top drivers:{" "}
          {demoPatient.riskResult.drivers.map((d) => formatFeatureName(d.feature)).join(", ")}.
        </p>
      </section>
    </div>
  );
}
