import { StyleSheet, Text, View } from 'react-native';

import { PatientCard } from '@/components/patient/patient-card';
import { PatientScreen } from '@/components/patient/patient-screen';
import { ErrorState, LoadingState } from '@/components/patient/screen-status';
import { SectionLabel } from '@/components/patient/section-label';
import { PatientColors, ToneColors } from '@/constants/patient-theme';
import type { PatientTone } from '@/constants/patient-theme';
import { usePatientProfileContext } from '@/context/patient-profile-context';

interface TimelineItemProps {
  title: string;
  detail: string;
  tone: PatientTone;
  isLast?: boolean;
}

function TimelineItem({ title, detail, tone, isLast = false }: TimelineItemProps) {
  const toneColor = ToneColors[tone].dot;
  const filled = tone === 'current';

  return (
    <View style={[styles.timelineRow, !isLast && styles.timelineRowSpaced]}>
      {!isLast && <View style={styles.timelineLine} />}
      <View
        style={[
          styles.timelineDot,
          { borderColor: toneColor },
          filled ? { backgroundColor: toneColor } : { backgroundColor: PatientColors.card },
        ]}
      />
      <View style={styles.timelineText}>
        <Text style={styles.timelineTitle}>{title}</Text>
        <Text style={styles.timelineDetail}>{detail}</Text>
      </View>
    </View>
  );
}

export default function TimelineScreen() {
  const { profile, status, error } = usePatientProfileContext();

  if (status === 'loading') {
    return (
      <PatientScreen>
        <LoadingState label="Loading your timeline…" />
      </PatientScreen>
    );
  }

  if (status === 'error' || !profile?.app_content || !profile.timeline) {
    return (
      <PatientScreen>
        <ErrorState message={error ?? undefined} />
      </PatientScreen>
    );
  }

  const { timeline, app_content: content } = profile;

  return (
    <PatientScreen>
      <Text style={styles.title}>My timeline</Text>

      <View style={styles.comingUpCard}>
        <SectionLabel tone="purple">Coming up</SectionLabel>
        <Text style={styles.comingUpTitle}>{content.next_appointment.when} — clinic visit</Text>
        <Text style={styles.comingUpDetail}>{content.next_appointment.detail}</Text>
      </View>

      <PatientCard style={styles.timelineCard}>
        {timeline.map((item, i) => (
          <TimelineItem key={item.title} {...item} isLast={i === timeline.length - 1} />
        ))}
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
  comingUpCard: {
    backgroundColor: PatientColors.purpleTintStrong,
    borderRadius: 20,
    padding: 20,
    gap: 6,
  },
  comingUpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PatientColors.ink,
  },
  comingUpDetail: {
    fontSize: 15,
    lineHeight: 21.75,
    color: PatientColors.body,
  },
  timelineCard: {
    gap: 0,
    paddingVertical: 20,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 14,
    marginLeft: 5,
    paddingLeft: 18,
  },
  timelineRowSpaced: {
    paddingBottom: 18,
  },
  timelineLine: {
    position: 'absolute',
    left: 0,
    top: 3,
    bottom: 0,
    width: 2,
    backgroundColor: PatientColors.divider,
  },
  timelineDot: {
    position: 'absolute',
    left: -7,
    top: 3,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
  },
  timelineText: {
    flex: 1,
    gap: 3,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: PatientColors.ink,
  },
  timelineDetail: {
    fontSize: 14,
    color: PatientColors.textMuted,
  },
});
