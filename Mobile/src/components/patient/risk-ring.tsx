import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { PatientColors } from '@/constants/patient-theme';

interface RiskRingProps {
  /** 0–1 fraction of the ring to fill. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label: string;
  sublabel: string;
}

/**
 * The design's ring is a CSS conic-gradient (web-only); RN has no
 * conic-gradient equivalent, so this renders the same progress-ring look
 * with an SVG stroked circle instead.
 */
export function RiskRing({ progress, size = 180, strokeWidth = 14, color = PatientColors.amber, label, sublabel }: RiskRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const dashOffset = circumference * (1 - clamped);

  return (
    <View style={{ width: size, height: size }}>
      {/* Rotate the whole SVG via a plain RN transform rather than Circle's
          own rotation/origin props — react-native-svg's web renderer turns
          those into an invalid `transform-origin` inline style (React DOM
          then flags it, which Expo's web dev overlay promotes to a full
          "Web ERROR" screen even though nothing is actually broken). */}
      <Svg width={size} height={size} style={[StyleSheet.absoluteFill, styles.rotated]}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={PatientColors.divider}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          fill="none"
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sublabel}>{sublabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rotated: {
    transform: [{ rotate: '-90deg' }],
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: PatientColors.ink,
  },
  sublabel: {
    fontSize: 13.5,
    color: PatientColors.textMuted,
  },
});
