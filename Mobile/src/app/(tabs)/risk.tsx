import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PatientButton } from '@/components/patient/button';
import { PatientCard } from '@/components/patient/patient-card';
import { PatientScreen } from '@/components/patient/patient-screen';
import { ErrorState, LoadingState } from '@/components/patient/screen-status';
import { RiskRing } from '@/components/patient/risk-ring';
import { SectionLabel } from '@/components/patient/section-label';
import { StatusDot } from '@/components/patient/status-dot';
import { PatientColors } from '@/constants/patient-theme';
import { categorizeRisk } from '@/lib/risk';
import { usePatientRiskContext } from '@/context/patient-risk-context';
import type { RiskCategory } from '@/types/clinical';

const STATUS_WORD: Record<RiskCategory, { word: string; color: string }> = {
  high: { word: 'Elevated', color: PatientColors.amber },
  moderate: { word: 'Watchful', color: PatientColors.yellow },
  low: { word: 'Stable', color: PatientColors.green },
};

type TrajectoryDirection = 'rising' | 'falling' | 'stable';

const TREND_SENTENCE: Record<TrajectoryDirection, string> = {
  rising: 'This has been rising over your recent visits.',
  falling: 'This has been easing over your recent visits.',
  stable: 'This has been holding steady over your recent visits.',
};

const CATEGORY_TONE_COLOR: Record<RiskCategory, string> = {
  low: PatientColors.greenBarLow,
  moderate: PatientColors.amberBarMid,
  high: PatientColors.amberBarHigh,
};

const DRIVER_DOT_COLORS = [PatientColors.amber, PatientColors.yellow, PatientColors.lavenderDot, PatientColors.purple];

function formatFeatureName(feature: string): string {
  return feature
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * TrajectoryPoint.time is a generic label per ml/schemas.py — either an ISO
 * timestamp or a short assessment tag like "assessment_3", never a
 * disease-specific one. Format the ISO case for compact display; pass
 * anything else through unchanged.
 */
function formatTrajectoryLabel(time: string): string {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return time;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function RiskScreen() {
  const { riskResult, status: loadStatus, error } = usePatientRiskContext();

  if (loadStatus === 'loading') {
    return (
      <PatientScreen>
        <LoadingState label="Loading your risk assessment…" />
      </PatientScreen>
    );
  }

  if (loadStatus === 'error' || !riskResult) {
    return (
      <PatientScreen>
        <ErrorState message={error ?? undefined} />
      </PatientScreen>
    );
  }

  const status = STATUS_WORD[riskResult.risk_category];
  const maxRisk = Math.max(...riskResult.trajectory.map((p) => p.risk), 0.01);

  return (
    <PatientScreen>
      <Text style={styles.title}>My risk</Text>

      <PatientCard style={styles.ringCard}>
        <RiskRing
          progress={riskResult.risk_score}
          color={status.color}
          label={status.word}
          sublabel={
            riskResult.trajectory.length > 0
              ? formatTrajectoryLabel(riskResult.trajectory[riskResult.trajectory.length - 1].time)
              : ''
          }
        />
        <Text style={styles.ringCaption}>
          {riskResult.risk_category === 'high'
            ? 'Higher than usual for this stage of pregnancy, and being watched closely by your team.'
            : riskResult.risk_category === 'moderate'
              ? 'A little higher than usual, so your team is checking in more often.'
              : 'Within the range your team expects at this stage.'}
        </Text>
      </PatientCard>

      <PatientCard>
        <SectionLabel>Across your pregnancy</SectionLabel>
        <View style={styles.barsRow}>
          {riskResult.trajectory.map((point, i) => {
            const heightPct = Math.max((point.risk / maxRisk) * 100, 8);
            const isLast = i === riskResult.trajectory.length - 1;
            return (
              <View key={`${point.time}-${i}`} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${heightPct}%`,
                        backgroundColor: CATEGORY_TONE_COLOR[categorizeRisk(point.risk)],
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, isLast && styles.barLabelActive]}>{formatTrajectoryLabel(point.time)}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.trendText}>{TREND_SENTENCE[riskResult.trajectory_direction]}</Text>
      </PatientCard>

      <PatientCard>
        <SectionLabel>{"What's behind it"}</SectionLabel>
        <View style={styles.driverList}>
          {riskResult.drivers.map((driver, i) => (
            <View key={driver.feature} style={styles.driverRow}>
              <StatusDot color={DRIVER_DOT_COLORS[i % DRIVER_DOT_COLORS.length]} />
              <Text style={styles.driverText}>{formatFeatureName(driver.feature)}</Text>
            </View>
          ))}
        </View>
        <PatientButton label="What does this mean?" variant="secondary" onPress={() => router.push('/why-risk')} />
      </PatientCard>
    </PatientScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: PatientColors.ink,
  },
  ringCard: {
    alignItems: 'center',
  },
  ringCaption: {
    fontSize: 16,
    lineHeight: 24.8,
    color: PatientColors.body,
    textAlign: 'center',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
    height: 120,
  },
  barColumn: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    gap: 7,
  },
  barTrack: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 8,
  },
  barLabel: {
    fontSize: 11.5,
    color: PatientColors.textFaint,
    textAlign: 'center',
  },
  barLabelActive: {
    color: PatientColors.ink,
    fontWeight: '600',
  },
  trendText: {
    fontSize: 15,
    lineHeight: 22.5,
    color: PatientColors.body,
  },
  driverList: {
    gap: 12,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverText: {
    fontSize: 16,
    color: PatientColors.ink,
  },
});
