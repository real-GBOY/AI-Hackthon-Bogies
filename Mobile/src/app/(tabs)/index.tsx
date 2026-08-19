import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientButton } from '@/components/patient/button';
import { PatientCard } from '@/components/patient/patient-card';
import { PatientScreen } from '@/components/patient/patient-screen';
import { ErrorState, LoadingState } from '@/components/patient/screen-status';
import { SectionLabel } from '@/components/patient/section-label';
import { StatusDot } from '@/components/patient/status-dot';
import { PatientColors, PatientRadii, PatientShadow } from '@/constants/patient-theme';
import { usePatientProfileContext } from '@/context/patient-profile-context';
import { usePatientRiskContext } from '@/context/patient-risk-context';
import type { RiskCategory } from '@/types/clinical';

const STATUS_COPY: Record<RiskCategory, { label: string; title: string; dot: string; text: string }> = {
  high: {
    label: 'CURRENT STATUS',
    title: 'Your care team is monitoring you more closely',
    dot: PatientColors.amber,
    text: PatientColors.amberDark,
  },
  moderate: {
    label: 'CURRENT STATUS',
    title: 'Your care team is watching a few things a little more closely',
    dot: PatientColors.yellow,
    text: PatientColors.yellowDark,
  },
  low: {
    label: 'CURRENT STATUS',
    title: 'Everything currently looks within the expected range',
    dot: PatientColors.green,
    text: PatientColors.greenDark,
  },
};

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel(date: Date): string {
  return date
    .toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();
}

export default function HomeScreen() {
  const { riskResult, status: riskStatus, error: riskError } = usePatientRiskContext();
  const { profile, status: profileStatus, error: profileError } = usePatientProfileContext();
  const now = new Date();

  if (riskStatus === 'loading' || profileStatus === 'loading') {
    return (
      <PatientScreen>
        <LoadingState label="Loading your home screen…" />
      </PatientScreen>
    );
  }

  if (riskStatus === 'error' || !riskResult || profileStatus === 'error' || !profile?.app_content) {
    return (
      <PatientScreen>
        <ErrorState message={riskError ?? profileError ?? undefined} />
      </PatientScreen>
    );
  }

  const content = profile.app_content;
  const status = STATUS_COPY[riskResult.risk_category];
  const bodyText =
    riskResult.driver_details?.[0]?.description ??
    'Based on your latest readings, your care team wants to keep a closer eye on a few things.';

  return (
    <PatientScreen>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.dateText}>{todayLabel(now)}</Text>
          <Text style={styles.greetingText}>
            {greetingForHour(now.getHours())}, {content.first_name}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.push('/profile')}
          style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}>
          <Text style={styles.avatarText}>{content.initials}</Text>
        </Pressable>
      </View>

      <PatientCard>
        <View style={styles.statusHeader}>
          <StatusDot color={status.dot} size={10} />
          <Text style={[styles.statusLabel, { color: status.text }]}>{status.label}</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.weekBadge}>Week {content.week}</Text>
        </View>
        <Text style={styles.statusTitle}>{status.title}</Text>
        <Text style={styles.statusBody}>{bodyText}</Text>
        <PatientButton label="See what this means" onPress={() => router.push('/why-risk')} />
      </PatientCard>

      <PatientCard style={styles.rowCard}>
        <View style={styles.taskIcon}>
          <Text style={styles.taskIconText}>1</Text>
        </View>
        <View style={styles.taskText}>
          <Text style={styles.taskTitle}>{content.todays_task.title}</Text>
          <Text style={styles.taskDetail}>{content.todays_task.detail}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </PatientCard>

      <Pressable onPress={() => router.push('/care-plan')}>
        <PatientCard>
          <SectionLabel>Next appointment</SectionLabel>
          <Text style={styles.appointmentWhen}>{content.next_appointment.when}</Text>
          <Text style={styles.appointmentDetail}>{content.next_appointment.detail}</Text>
        </PatientCard>
      </Pressable>

      <View style={styles.learnSection}>
        <SectionLabel>Learn</SectionLabel>
        <View style={styles.learnRow}>
          <Pressable style={styles.learnCard} onPress={() => router.push('/learn/what-is-preeclampsia')}>
            <View style={[styles.learnIcon, { backgroundColor: PatientColors.greenIconBg }]} />
            <Text style={styles.learnTitle}>What is preeclampsia?</Text>
          </Pressable>
          <Pressable style={styles.learnCard} onPress={() => router.push('/learn/why-blood-pressure-is-watched')}>
            <View style={[styles.learnIcon, { backgroundColor: PatientColors.purpleIconBg }]} />
            <Text style={styles.learnTitle}>Why blood pressure is watched</Text>
          </Pressable>
        </View>
      </View>

      <PatientButton
        label="Ask a question"
        variant="purple"
        pill
        onPress={() => router.navigate('/ask')}
        style={styles.askButton}
      />
    </PatientScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerText: {
    gap: 2,
  },
  dateText: {
    fontSize: 12.5,
    color: PatientColors.textMuted,
    letterSpacing: 0.3,
  },
  greetingText: {
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: PatientColors.ink,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PatientColors.purpleAvatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPressed: {
    opacity: 0.75,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: PatientColors.purpleAvatarText,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  weekBadge: {
    fontSize: 12.5,
    color: PatientColors.textFaint,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 29,
    letterSpacing: -0.2,
    color: PatientColors.ink,
  },
  statusBody: {
    fontSize: 16,
    lineHeight: 24.8,
    color: PatientColors.body,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  taskIcon: {
    width: 46,
    height: 46,
    borderRadius: PatientRadii.icon,
    backgroundColor: PatientColors.purpleTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskIconText: {
    fontSize: 15,
    fontWeight: '600',
    color: PatientColors.purpleDark,
  },
  taskText: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: PatientColors.ink,
  },
  taskDetail: {
    fontSize: 14,
    color: PatientColors.textMuted,
  },
  chevron: {
    fontSize: 24,
    color: PatientColors.chevron,
  },
  appointmentWhen: {
    fontSize: 20,
    fontWeight: '600',
    color: PatientColors.ink,
  },
  appointmentDetail: {
    fontSize: 15,
    lineHeight: 21.75,
    color: PatientColors.body,
  },
  learnSection: {
    gap: 10,
  },
  learnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  learnCard: {
    flex: 1,
    minHeight: 110,
    backgroundColor: PatientColors.card,
    borderRadius: PatientRadii.card,
    padding: 16,
    gap: 8,
    justifyContent: 'flex-end',
    ...PatientShadow,
  },
  learnIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  learnTitle: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
    color: PatientColors.ink,
  },
  askButton: {
    marginTop: 4,
  },
});
