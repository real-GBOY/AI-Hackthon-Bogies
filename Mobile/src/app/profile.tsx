import { StyleSheet, Text, View } from 'react-native';

import { ChevronRow } from '@/components/patient/chevron-row';
import { PatientCard } from '@/components/patient/patient-card';
import { PatientScreen } from '@/components/patient/patient-screen';
import { ErrorState, LoadingState } from '@/components/patient/screen-status';
import { PatientColors } from '@/constants/patient-theme';
import { usePatientProfileContext } from '@/context/patient-profile-context';

export default function ProfileScreen() {
  const { profile, status, error } = usePatientProfileContext();

  if (status === 'loading') {
    return (
      <PatientScreen isPushedScreen>
        <LoadingState label="Loading your profile…" />
      </PatientScreen>
    );
  }

  if (status === 'error' || !profile?.app_content) {
    return (
      <PatientScreen isPushedScreen>
        <ErrorState message={error ?? undefined} />
      </PatientScreen>
    );
  }

  const content = profile.app_content;

  return (
    <PatientScreen isPushedScreen>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{content.initials}</Text>
        </View>
        <View>
          <Text style={styles.name}>{content.full_name}</Text>
          <Text style={styles.meta}>
            Week {content.week} · due {content.due_date}
          </Text>
        </View>
      </View>

      <PatientCard style={styles.listCard}>
        <ChevronRow title="Personal information" />
        <ChevronRow title="Pregnancy information" />
        <ChevronRow title="My care team" isLast />
      </PatientCard>

      <PatientCard style={styles.listCard}>
        <ChevronRow title="Reminders" detail="Twice daily" showChevron={false} />
        <ChevronRow title="Language" detail="English" showChevron={false} />
        <ChevronRow title="Who can see my data" isLast />
      </PatientCard>

      <PatientCard style={styles.listCard}>
        <ChevronRow title="Privacy and consent" />
        <ChevronRow title="Sign out" showChevron={false} isLast />
      </PatientCard>

      <Text style={styles.disclaimer}>
        HDP Intelligence does not provide medical advice. Always contact your care team about symptoms.
      </Text>
    </PatientScreen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: PatientColors.purpleAvatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 19,
    fontWeight: '600',
    color: PatientColors.purpleAvatarText,
  },
  name: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: PatientColors.ink,
  },
  meta: {
    fontSize: 14.5,
    color: PatientColors.textMuted,
  },
  listCard: {
    padding: 0,
    gap: 0,
    overflow: 'hidden',
  },
  disclaimer: {
    fontSize: 13.5,
    color: PatientColors.textFaint,
    textAlign: 'center',
    lineHeight: 19.5,
  },
});
