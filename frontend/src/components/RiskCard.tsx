import type { RiskResult } from "../types";
import "./RiskCard.css";

const TREND_LABEL: Record<string, string> = {
  rising: "Rising",
  stable: "Stable",
  falling: "Falling",
};

const TREND_ICON: Record<string, string> = {
  rising: "↑",
  stable: "→",
  falling: "↓",
};

interface RiskCardProps {
  riskResult: RiskResult;
  /** Free-text identity line (name, id, etc.) — RiskCard has no concept of "patient". */
  subtitle?: string;
}

export function RiskCard({ riskResult, subtitle }: RiskCardProps) {
  const trend = riskResult.trajectory_direction;
  const riskPercent = Math.round(riskResult.risk_score * 100);

  return (
    <div className="risk-card">
      <div className="risk-card__header">
        <span className="risk-card__label">Calibrated risk</span>
        <span className={`risk-card__badge risk-card__badge--${trend}`}>
          <span aria-hidden="true">{TREND_ICON[trend]}</span>
          {TREND_LABEL[trend]}
        </span>
      </div>
      <div className="risk-card__score">{riskPercent}%</div>
      {subtitle && <div className="risk-card__meta">{subtitle}</div>}
      {riskResult.uncertainty.flag && (
        <div className="risk-card__uncertainty">⚠ {riskResult.uncertainty.reason ?? "Flagged for review"}</div>
      )}
    </div>
  );
}
