/**
 * Runtime shape checks for responses from the ML service. Used by the
 * services layer to catch a malformed/mismatched backend response before it
 * reaches components, rather than trusting `response.json()`'s `any`.
 */

import type { RagQueryResponse, RiskResult } from "../types";

export function isRiskResult(value: unknown): value is RiskResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.risk_score === "number" &&
    typeof v.risk_category === "string" &&
    Array.isArray(v.trajectory) &&
    typeof v.trajectory_direction === "string" &&
    Array.isArray(v.drivers) &&
    typeof v.uncertainty === "object" &&
    v.uncertainty !== null &&
    typeof v.confidence === "number"
  );
}

export function isRagQueryResponse(value: unknown): value is RagQueryResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.answer === "string" &&
    typeof v.mode === "string" &&
    typeof v.refused === "boolean" &&
    Array.isArray(v.citations) &&
    typeof v.escalation_flag === "boolean" &&
    typeof v.safety_override_applied === "boolean"
  );
}
