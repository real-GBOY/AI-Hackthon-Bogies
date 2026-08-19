/**
 * Style-object builders for the HDP Intelligence clinician UI. Colors come
 * from ./colors.ts (the single source of truth) — this file only builds the
 * CSSProperties objects and layout constants derived from them; the band
 * thresholds mirror lib/risk.ts so a patient card here always agrees with
 * categorizeRisk().
 */

import type { CSSProperties } from "react";
import type { RiskCategory } from "../types";
import {
  neutral,
  primary as primaryColor,
  riskAvatarBg,
  riskAvatarText,
  riskBase,
  riskBorder,
  riskText,
  riskTint,
  trend,
} from "./colors";

export const COLOR = {
  high: riskBase("high"),
  moderate: riskBase("moderate"),
  low: riskBase("low"),
  primary: primaryColor.base,
  primaryHover: primaryColor.hover,
  text: neutral.ink,
  muted: neutral.slate,
  faint: neutral.slateSoft,
} as const;

export function bandColor(category: RiskCategory): string {
  return riskBase(category);
}

export function bandLabel(category: RiskCategory): string {
  return category === "high" ? "High" : category === "moderate" ? "Moderate" : "Low";
}

/** 0..1 risk_score -> 0..100 display score, matching the mockup's integer scale. */
export function displayScore(riskScore: number): number {
  return Math.round(riskScore * 100);
}

export function pillStyle(category: RiskCategory): CSSProperties {
  return {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    fontWeight: 600,
    color: bandColor(category),
    background: riskTint(category),
    border: `1px solid ${riskBorder(category)}`,
    borderRadius: 6,
    padding: "3px 7px",
    minWidth: 34,
    textAlign: "center",
  };
}

export function badgeStyle(category: RiskCategory): CSSProperties {
  return {
    fontSize: 12.5,
    fontWeight: 600,
    color: riskText(category),
    background: riskTint(category),
    border: `1px solid ${riskBorder(category)}`,
    borderRadius: 6,
    padding: "3px 8px",
  };
}

export function trendChipStyle(direction: "rising" | "stable" | "falling"): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11.5,
    fontWeight: 500,
    borderRadius: 6,
    padding: "2px 7px",
    whiteSpace: "nowrap",
  };
  const t = trend[direction];
  return { ...base, color: t.text, background: t.tint };
}

export function trendLabel(direction: "rising" | "stable" | "falling"): string {
  if (direction === "rising") return "▲ rising";
  if (direction === "falling") return "▼ falling";
  return "— stable";
}

export function avatarStyle(category: RiskCategory, size = 30): CSSProperties {
  return {
    width: size,
    height: size,
    flex: `0 0 ${size}px`,
    borderRadius: 999,
    background: riskAvatarBg(category),
    color: riskAvatarText(category),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: size >= 44 ? 15 : 11,
    fontWeight: 600,
  };
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
}

export function dotStyle(color: string, size = 8): CSSProperties {
  return { width: size, height: size, borderRadius: 999, background: color, flex: `0 0 ${size}px` };
}

/** Builds an SVG polyline path from a series of 0..1 values into a w x h box. */
export function sparkPath(values: number[], w: number, h: number, pad = 2): string {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
