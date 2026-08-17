import type { RiskCategory, TrajectoryDirection, TrajectoryPoint } from "../types";

/**
 * Mirrors the constants and derivation logic in ml/app.py so the mock data
 * (built with these helpers) demos the same semantics a real /predict
 * response would have. If the backend's boundaries change, update both.
 */
export const RISK_LOW_BOUNDARY = 0.34;
export const RISK_HIGH_BOUNDARY = 0.67;
export const UNCERTAINTY_MARGIN = 0.05;
export const TREND_STABLE_BAND = 0.03;

export function categorizeRisk(score: number): RiskCategory {
  if (score < RISK_LOW_BOUNDARY) return "low";
  if (score < RISK_HIGH_BOUNDARY) return "moderate";
  return "high";
}

export function isNearBoundary(score: number): boolean {
  return (
    Math.abs(score - RISK_LOW_BOUNDARY) <= UNCERTAINTY_MARGIN ||
    Math.abs(score - RISK_HIGH_BOUNDARY) <= UNCERTAINTY_MARGIN
  );
}

/** Derives direction from the last two trajectory points. Prefer a
 * RiskResult's own `trajectory_direction` when one is already available —
 * this is a fallback for building/validating that field. */
export function directionFromTrajectory(trajectory: TrajectoryPoint[]): TrajectoryDirection {
  if (trajectory.length < 2) return "stable";
  const delta = trajectory[trajectory.length - 1].risk - trajectory[trajectory.length - 2].risk;
  if (delta > TREND_STABLE_BAND) return "rising";
  if (delta < -TREND_STABLE_BAND) return "falling";
  return "stable";
}
