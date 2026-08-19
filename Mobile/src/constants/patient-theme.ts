/**
 * Design tokens for the patient app, ported from the "Patient app" section
 * of the HDP Intelligence design (Claude Design project
 * f82300c5-16a5-4735-a4a5-b8ca4591f6f8, HDP Intelligence.dc.html). The
 * source design is deliberately light-mode-only ("Light-mode foundation" —
 * every iOS mock in it renders with dark=false), so this palette is a fixed
 * light theme rather than a light/dark pair like constants/theme.ts. Hex
 * values are exact sRGB conversions of the design's oklch() tokens (RN
 * StyleSheet doesn't support oklch()).
 */

export const PatientColors = {
  // Surfaces
  screenBackground: '#F5F5F7',
  card: '#FFFFFF',
  divider: '#F0F1F4',
  overlayTint: '#F2F2F5',

  // Text
  ink: '#14161C',
  body: '#3C4250',
  textSecondary: '#4A5160',
  textMuted: '#8A91A0',
  textFaint: '#9AA1B0',
  chevron: '#C9CED8',

  // Brand purple (primary actions, AI assistant, accents)
  purple: '#6359B5',
  purpleDark: '#483C95',
  purpleHover: '#50459E',
  purpleTint: '#F4F4FF',
  purpleTintStrong: '#F9F9FF',
  purpleBorder: '#DBDCF2',
  purpleAvatarBg: '#E8E9FF',
  purpleAvatarText: '#48408B',
  purpleIconBg: '#ECECFF',
  lavenderDot: '#A0A0C9',

  // Amber ("elevated" / current status)
  amber: '#C45E39',
  amberDark: '#983E1B',
  amberBarMid: '#EBCBA7',
  amberBarHigh: '#EFA187',

  // Yellow ("watch")
  yellow: '#CB882E',
  yellowDark: '#845000',
  yellowTint: '#FFEED6',
  yellowBorder: '#F2D1AD',

  // Green ("stable")
  green: '#3F9278',
  greenDark: '#00624B',
  greenTint: '#E5F6F0',
  greenBorder: '#BFE1D3',
  greenIconBg: '#DCF5EB',
  greenBarLow: '#AED9C9',

  // Red ("urgent" / safety escalation)
  red: '#BD413F',
  redDark: '#AC3031',
  redTint: '#FFF0EE',
  redBorder: '#F7CBC7',

  slateIconBg: '#E3F1FB',

  black: '#000000',
  white: '#FFFFFF',
} as const;

export const PatientRadii = {
  card: 20,
  cardLarge: 20,
  control: 14,
  controlSmall: 10,
  chip: 9999,
  icon: 12,
} as const;

export const PatientSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

/**
 * Clearance a tab-root screen needs above its content so the floating pill
 * tab bar (src/app/(tabs)/_layout.tsx's PillDock) never covers it. Unlike
 * constants/theme.ts's BottomTabInset (tuned for a native OS tab bar, and 0
 * on web since that bar didn't render there), this pill is a plain RN view
 * that renders identically — and needs real clearance — on every platform
 * including web. Screens still add their own `insets.bottom` on top of this;
 * this constant only covers the pill's own height plus its margin above the
 * safe area.
 */
export const PatientTabBarClearance = 78;

export const PatientShadow = {
  shadowColor: '#14161C',
  shadowOpacity: 0.06,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
  elevation: 2,
} as const;

export type PatientTone = 'current' | 'watch' | 'stable' | 'urgent' | 'neutral';

export const ToneColors: Record<PatientTone, { dot: string; text: string; bg: string; border: string }> = {
  current: { dot: PatientColors.amber, text: PatientColors.amberDark, bg: PatientColors.purpleTint, border: PatientColors.purpleBorder },
  watch: { dot: PatientColors.yellow, text: PatientColors.yellowDark, bg: PatientColors.yellowTint, border: PatientColors.yellowBorder },
  stable: { dot: PatientColors.green, text: PatientColors.greenDark, bg: PatientColors.greenTint, border: PatientColors.greenBorder },
  urgent: { dot: PatientColors.red, text: PatientColors.redDark, bg: PatientColors.redTint, border: PatientColors.redBorder },
  neutral: { dot: PatientColors.textFaint, text: PatientColors.textSecondary, bg: PatientColors.overlayTint, border: PatientColors.divider },
};
