/**
 * Visual tokens for the HDP Intelligence clinician UI, derived from the
 * Claude Design mockup ("HDP Intelligence.dc.html"). Colors mirror the
 * mockup's oklch palette; the band thresholds mirror lib/risk.ts so a
 * patient card here always agrees with categorizeRisk().
 */

import type { CSSProperties } from "react";
import type { RiskCategory } from "../types";

export const COLOR = {
  high: "oklch(0.55 0.16 25)",
  moderate: "oklch(0.68 0.13 70)",
  low: "oklch(0.60 0.09 170)",
  primary: "oklch(0.52 0.14 285)",
  primaryHover: "oklch(0.45 0.14 285)",
  text: "#14161c",
  muted: "#666d7d",
  faint: "#8a91a0",
} as const;

const HUE: Record<RiskCategory, number> = { high: 25, moderate: 70, low: 170 };

export function bandColor(category: RiskCategory): string {
  return COLOR[category];
}

export function bandLabel(category: RiskCategory): string {
  return category === "high" ? "High" : category === "moderate" ? "Moderate" : "Low";
}

/** 0..1 risk_score -> 0..100 display score, matching the mockup's integer scale. */
export function displayScore(riskScore: number): number {
  return Math.round(riskScore * 100);
}

export function pillStyle(category: RiskCategory): CSSProperties {
  const hue = HUE[category];
  return {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    fontWeight: 600,
    color: bandColor(category),
    background: `oklch(0.97 0.02 ${hue})`,
    border: `1px solid oklch(0.89 0.05 ${hue})`,
    borderRadius: 6,
    padding: "3px 7px",
    minWidth: 34,
    textAlign: "center",
  };
}

export function badgeStyle(category: RiskCategory): CSSProperties {
  const hue = HUE[category];
  return {
    fontSize: 12.5,
    fontWeight: 600,
    color: `oklch(0.46 0.13 ${hue})`,
    background: `oklch(0.97 0.02 ${hue})`,
    border: `1px solid oklch(0.89 0.05 ${hue})`,
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
  if (direction === "rising") return { ...base, color: "oklch(0.50 0.16 25)", background: "oklch(0.97 0.02 25)" };
  if (direction === "falling") return { ...base, color: "oklch(0.44 0.09 170)", background: "oklch(0.97 0.02 170)" };
  return { ...base, color: "#666d7d", background: "#f4f5f8" };
}

export function trendLabel(direction: "rising" | "stable" | "falling"): string {
  if (direction === "rising") return "▲ rising";
  if (direction === "falling") return "▼ falling";
  return "— stable";
}

export function avatarStyle(category: RiskCategory, size = 30): CSSProperties {
  const hue = category === "low" ? 285 : HUE[category];
  return {
    width: size,
    height: size,
    flex: `0 0 ${size}px`,
    borderRadius: 999,
    background: `oklch(0.95 0.02 ${hue})`,
    color: `oklch(0.42 0.10 ${hue})`,
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
