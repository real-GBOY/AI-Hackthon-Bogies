/**
 * Single source of truth for every color used under src/hdp (the clinician
 * "HDP Intelligence" UI). Nothing outside this file should write a raw
 * hex/oklch/rgba literal — add or extend a token here instead.
 *
 * Two ways this gets consumed:
 *  - TSX inline styles import the named tokens/functions directly.
 *  - Plain CSS (HdpShell.css, Views.css) can't import TS, so HdpShell.tsx
 *    sets `cssVars` as inline custom properties on the root `.hdp` element;
 *    the stylesheets then read them as var(--hdp-*).
 */

import type { RiskCategory } from "../types";

function oklch(l: number, c: number, h: number, a?: number): string {
  return a === undefined ? `oklch(${l} ${c} ${h})` : `oklch(${l} ${c} ${h} / ${a})`;
}

/** Base hues for the three risk bands, plus the brand/primary hue. */
export const hue = { high: 25, moderate: 70, low: 170, primary: 285 } as const;

const RISK_L: Record<RiskCategory, number> = { high: 0.55, moderate: 0.68, low: 0.6 };
const RISK_C: Record<RiskCategory, number> = { high: 0.16, moderate: 0.13, low: 0.09 };

/** The risk band's own color (dots, pill text, chart line/points). */
export function riskBase(category: RiskCategory, alpha?: number): string {
  return oklch(RISK_L[category], RISK_C[category], hue[category], alpha);
}
/** Tinted background for a risk-band pill/badge/chip. */
export function riskTint(category: RiskCategory): string {
  return oklch(0.97, 0.02, hue[category]);
}
/** Border for a risk-band pill/badge/chip. */
export function riskBorder(category: RiskCategory): string {
  return oklch(0.89, 0.05, hue[category]);
}
/** Text color for a risk-band badge (darker/more saturated than the base dot color). */
export function riskText(category: RiskCategory): string {
  return oklch(0.46, 0.13, hue[category]);
}
/** Trajectory-chart area-under-curve fill — flat L/C across bands, hue + alpha only vary. */
export function riskAreaFill(category: RiskCategory, alpha = 0.1): string {
  return oklch(0.6, 0.13, hue[category], alpha);
}
/** Trajectory-chart risk-zone band fill — the band's own color, washed out. */
export function riskZoneFill(category: RiskCategory, alpha = 0.06): string {
  return riskBase(category, alpha);
}
/** Avatar initials bubble. The "low" band borrows the brand hue rather than its own (matches the mockup). */
export function riskAvatarBg(category: RiskCategory): string {
  return oklch(0.95, 0.02, category === "low" ? hue.primary : hue[category]);
}
export function riskAvatarText(category: RiskCategory): string {
  return oklch(0.42, 0.1, category === "low" ? hue.primary : hue[category]);
}

export const primary = {
  base: oklch(0.52, 0.14, hue.primary),
  hover: oklch(0.45, 0.14, hue.primary),
  text: oklch(0.42, 0.14, hue.primary),
  tint: oklch(0.96, 0.02, hue.primary),
  tintGhost: oklch(0.985, 0.008, hue.primary),
  tintSoft: oklch(0.99, 0.005, hue.primary),
  ring: oklch(0.93, 0.03, hue.primary),
  border: oklch(0.9, 0.03, hue.primary),
  borderStrong: oklch(0.88, 0.04, hue.primary),
} as const;

/**
 * Neutral gray scale, darkest to lightest. Named descriptively rather than
 * numbered so a call site like `neutral.slateSoft` still reads at a glance.
 */
export const neutral = {
  white: "#ffffff",
  ink: "#14161c",
  inkSoft: "#3c4250",
  slate: "#666d7d",
  slateSoft: "#8a91a0",
  slateSofter: "#9aa1b0",
  slateFaint: "#a8aeba",
  slateFainter: "#b6bcc7",
  slateGhost: "#c0c6d0",
  border: "#e3e6ec",
  borderSoft: "#eef0f4",
  rowBorder: "#f3f4f7",
  surfaceMuted: "#f2f3f6",
  surfaceFaint: "#f4f5f8",
  surfaceFaintest: "#f8f9fb",
  panelBg: "#fafbfc",
  bg: "#f6f7f9",
  bgOverlay: "rgba(246, 247, 249, 0.88)",
  chipBorder: "#e9ebf0",
  chipText: "#4a5160",
} as const;

export const shadow = {
  sm: "0 1px 2px rgba(20, 22, 28, 0.04)",
  md: "0 1px 2px rgba(20, 22, 28, 0.06)",
  lg: "0 1px 2px rgba(20, 22, 28, 0.08)",
} as const;

/** Trend chip colors — visually close to but distinct from the risk-band palette above. */
export const trend = {
  rising: { text: oklch(0.5, 0.16, hue.high), tint: riskTint("high") },
  falling: { text: oklch(0.44, 0.09, hue.low), tint: riskTint("low") },
  stable: { text: neutral.slate, tint: neutral.surfaceFaint },
} as const;

/** "Live backend" / "service reachable" indicator text — reuses the trend-falling green. */
export const positiveText = trend.falling.text;

/** AiView's "N sources cited" chip. */
export const evidence = {
  bg: oklch(0.96, 0.02, hue.low),
  border: oklch(0.88, 0.04, hue.low),
  text: oklch(0.42, 0.09, hue.low),
} as const;

/**
 * The `--hdp-*` custom properties HdpShell.css and Views.css read via
 * var(--hdp-x). Set once as an inline style on the `.hdp` root element in
 * HdpShell.tsx so the two stylesheets never hardcode a literal.
 */
export const cssVars: Record<string, string> = {
  "--hdp-primary": primary.base,
  "--hdp-primary-hover": primary.hover,
  "--hdp-primary-tint": primary.tint,
  "--hdp-primary-tint-ghost": primary.tintGhost,
  "--hdp-primary-border": primary.border,
  "--hdp-primary-text": primary.text,
  "--hdp-primary-ring": primary.ring,
  "--hdp-white": neutral.white,
  "--hdp-text": neutral.ink,
  "--hdp-text-soft": neutral.inkSoft,
  "--hdp-muted": neutral.slate,
  "--hdp-faint": neutral.slateSoft,
  "--hdp-faint-2": neutral.slateSofter,
  "--hdp-faintest": neutral.slateFaint,
  "--hdp-border": neutral.border,
  "--hdp-border-soft": neutral.borderSoft,
  "--hdp-row-border": neutral.rowBorder,
  "--hdp-surface-muted": neutral.surfaceMuted,
  "--hdp-panel-bg": neutral.panelBg,
  "--hdp-bg": neutral.bg,
  "--hdp-bg-overlay": neutral.bgOverlay,
  "--hdp-danger": riskBase("high"),
  "--hdp-danger-tint": riskTint("high"),
  "--hdp-shadow-sm": shadow.sm,
  "--hdp-shadow-md": shadow.md,
  "--hdp-shadow-lg": shadow.lg,
};
