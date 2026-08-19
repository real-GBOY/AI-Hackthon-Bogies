import type { RiskResult } from "../types";
import "./PatientRiskSummary.css";

/**
 * Patient Mode's own, deliberately simpler risk view — no raw risk_score
 * percentage (projectOVW.md §13: "the platform should avoid presenting a
 * number without explanation"). Built separately from RiskCard rather than
 * reusing it with conditional logic, so clinician and patient presentation
 * can evolve independently (see PLAN.md Phase E).
 */

const CATEGORY_TEXT: Record<RiskResult["risk_category"], string> = {
  low: "Your information currently falls in the lower-risk range.",
  moderate: "Your information currently falls in the moderate-risk range.",
  high: "Your information currently falls in the higher-risk range.",
};

const TREND_TEXT: Record<RiskResult["trajectory_direction"], string> = {
  rising: "This has been increasing over your recent visits.",
  falling: "This has been decreasing over your recent visits.",
  stable: "This has been holding steady over your recent visits.",
};

interface PatientRiskSummaryProps {
  riskResult: RiskResult;
}

export function PatientRiskSummary({ riskResult }: PatientRiskSummaryProps) {
  const descriptions =
    riskResult.driver_details && riskResult.driver_details.length > 0
      ? riskResult.driver_details.map((d) => d.description)
      : [];

  return (
    <div className="patient-risk-summary">
      <p className="patient-risk-summary__status">{CATEGORY_TEXT[riskResult.risk_category]}</p>
      <p className="patient-risk-summary__trend">{TREND_TEXT[riskResult.trajectory_direction]}</p>

      {descriptions.length > 0 && (
        <div className="patient-risk-summary__why">
          <p className="patient-risk-summary__why-label">Things your provider is watching:</p>
          <ul className="patient-risk-summary__why-list">
            {descriptions.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="patient-risk-summary__disclaimer">
        This is general information, not a diagnosis. Only your healthcare provider can tell you what this
        means for you.
      </p>
    </div>
  );
}
