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
import "./PatientJourney.css";

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
  const latest = demoAssessments[demoAssessments.length - 1];
  const baseline = demoAssessments[0];

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
            <p className="journey-answer__text">{renderAnswerWithCitations(whyRiskChanged.answer)}</p>
            <p className="journey-answer__note">
              Real output from <code>generate.py</code>, grounded in the retrieved guideline passages below —
              not written by hand.
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
