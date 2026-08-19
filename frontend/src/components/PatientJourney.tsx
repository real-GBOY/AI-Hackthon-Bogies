import { useState } from "react";
import { RiskCard } from "./RiskCard";
import { TrajectoryChart } from "./TrajectoryChart";
import { DriversList } from "./DriversList";
import { usePatientJourney } from "../hooks/usePatientJourney";
import { useRagQuery } from "../hooks/useRagQuery";
import { formatFeatureName, SYMPTOM_LABELS } from "../hdp/aggregate";
import "./PatientJourney.css";

const JOURNEY_PATIENT_ID = "demo-1";

// Same clinical scenario demo-1's captured_qa.answer was captured from (see
// ml/patient_store.py's PATIENT_CONTENT docstring) — asking it live re-runs
// the identical question through the real pipeline instead of replaying the
// baked output.
const LIVE_QUESTION =
  "A patient at 30 weeks gestation has blood pressure 165/95 with a new severe headache and blurred " +
  "vision, after having a normal blood pressure of 118/76 at week 24. Why does this indicate increased " +
  "risk and what should happen next?";

// Cosmetic display-name mapping for guideline document codes — not
// patient/clinical data, so this stays a small local constant rather than
// coming from the backend.
const SOURCE_FULL_NAMES: Record<string, string> = {
  "ACOG-222": "Gestational Hypertension & Preeclampsia, ACOG Practice Bulletin No. 222",
  WHO: "WHO Recommendations for the Prevention and Treatment of Pre-eclampsia and Eclampsia, 2011",
  "NICE-NG133": "NICE, Hypertension in Pregnancy: Diagnosis and Management",
};

function symptomsFromFeatures(features: Record<string, unknown>): string[] {
  return Object.entries(SYMPTOM_LABELS)
    .filter(([key]) => features[key] === true)
    .map(([, label]) => label);
}

function renderAnswerWithCitations(answer: string) {
  const parts = answer.split(/(\[[^[\]]+\])/g);
  return parts.map((part, i) => {
    const match = /^\[([^\]]+)\]$/.exec(part);
    if (!match) return <span key={i}>{part}</span>;
    return (
      <span key={i} className="journey-cite" title={SOURCE_FULL_NAMES[match[1].split(" p.")[0]] ?? undefined}>
        [{match[1]}]
      </span>
    );
  });
}

export function PatientJourney() {
  const [revealed, setRevealed] = useState(false);
  const [source, setSource] = useState<"captured" | "live">("captured");
  const { status: liveState, data: liveResult, error: liveError, ask } = useRagQuery();
  const { data: journey, status: journeyStatus, error: journeyError } = usePatientJourney(JOURNEY_PATIENT_ID);

  async function handleSelectSource(next: "captured" | "live") {
    setSource(next);
    if (next === "live" && liveState === "idle") {
      await ask(LIVE_QUESTION, "clinician");
    }
  }

  if (journeyStatus === "loading") {
    return (
      <div className="journey">
        <p className="journey-answer__note">Loading patient journey…</p>
      </div>
    );
  }

  if (journeyStatus === "error" || !journey || journey.assessments.length === 0) {
    return (
      <div className="journey">
        <p className="journey-answer__note journey-answer__note--error">
          {journeyError ?? "Couldn't load the patient journey."}
        </p>
      </div>
    );
  }

  const { profile, assessments, riskResult } = journey;
  const latest = assessments[assessments.length - 1];
  const baseline = assessments[0];
  const latestWeek = latest.features.gestational_week as number | undefined;
  const baselineWeek = baseline.features.gestational_week as number | undefined;
  const latestSystolic = latest.features.bp_systolic as number;
  const latestDiastolic = latest.features.bp_diastolic as number;
  const baselineSystolic = baseline.features.bp_systolic as number;
  const baselineDiastolic = baseline.features.bp_diastolic as number;
  const latestSymptoms = symptomsFromFeatures(latest.features);

  return (
    <div className="journey">
      <section className="journey-block journey-profile">
        <h2 className="journey-block__title">Patient profile</h2>
        <p className="journey-profile__text">
          {profile.age}-year-old, first pregnancy{latestWeek != null ? `, ${latestWeek} weeks gestation` : ""}.
          Blood pressure had been normal throughout — {baselineSystolic}/{baselineDiastolic} mmHg
          {baselineWeek != null ? ` at week ${baselineWeek}` : ""}, no symptoms.
        </p>
      </section>

      <section className="journey-block journey-report">
        <h2 className="journey-block__title">Today's report</h2>
        <p className="journey-report__alert">
          {latestSymptoms.length > 0 ? `Reported symptoms: ${latestSymptoms.join(", ")}.` : "No new symptoms reported."}{" "}
          Blood pressure on arrival: <strong>{latestSystolic}/{latestDiastolic} mmHg</strong>.
        </p>
        {profile.intake_followup && profile.intake_followup.length > 0 && (
          <div className="journey-followup">
            <p className="journey-followup__label">Adaptive follow-up</p>
            {profile.intake_followup.map((qa) => (
              <div className="journey-followup__row" key={qa.question}>
                <span className="journey-followup__q">{qa.question}</span>
                <span className="journey-followup__a">{qa.answer}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="journey-block">
        <h2 className="journey-block__title">Risk trajectory</h2>
        <div className="journey-risk-grid">
          <RiskCard riskResult={riskResult} subtitle={`${profile.name} · ${profile.age}y · ${profile.patient_id}`} />
          <TrajectoryChart trajectory={riskResult.trajectory} />
        </div>
        <DriversList drivers={riskResult.drivers} />
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

            {source === "captured" &&
              (profile.captured_qa ? (
                <>
                  <p className="journey-answer__text">{renderAnswerWithCitations(profile.captured_qa.answer)}</p>
                  <p className="journey-answer__note">
                    Real output from <code>generate.py</code>, grounded in the retrieved guideline passages
                    below — captured once and baked in for demo reliability (Groq's free-tier rate limits
                    make a live call during judging risky).
                  </p>
                  <div className="journey-retrieved">
                    <p className="journey-retrieved__label">Retrieved passages</p>
                    <ul className="journey-retrieved__list">
                      {profile.captured_qa.retrieved.map((r, i) => (
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
              ) : (
                <p className="journey-answer__note">No captured answer available for this patient.</p>
              ))}

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
          {profile.name} ({profile.age}y{latestWeek != null ? `, ${latestWeek} weeks` : ""}): BP rose from{" "}
          {baselineSystolic}/{baselineDiastolic}
          {baselineWeek != null ? ` at week ${baselineWeek}` : ""} to {latestSystolic}/{latestDiastolic} today
          {latestSymptoms.length > 0 ? `, with new ${latestSymptoms.join(", ")}` : ""}. Risk category is now{" "}
          <strong>{riskResult.risk_category}</strong> ({riskResult.trajectory_direction}
          ). Top drivers:{" "}
          {riskResult.drivers.map((d) => formatFeatureName(d.feature)).join(", ")}.
        </p>
      </section>
    </div>
  );
}
