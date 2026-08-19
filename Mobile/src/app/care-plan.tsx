import { StyleSheet, Text, View } from 'react-native';

import { PatientButton } from '@/components/patient/button';
import { PatientCard } from '@/components/patient/patient-card';
import { PatientScreen } from '@/components/patient/patient-screen';
import { ErrorState, LoadingState } from '@/components/patient/screen-status';
import { SectionLabel } from '@/components/patient/section-label';
import { StatusDot } from '@/components/patient/status-dot';
import { PatientColors, ToneColors } from '@/constants/patient-theme';
import { usePatientProfileContext } from '@/context/patient-profile-context';

export default function CarePlanScreen() {
  const { profile, status, error } = usePatientProfileContext();

  if (status === 'loading') {
    return (
      <PatientScreen isPushedScreen>
        <LoadingState label="Loading your care plan…" />
      </PatientScreen>
    );
  }

  if (status === 'error' || !profile?.care_plan) {
    return (
      <PatientScreen isPushedScreen>
        <ErrorState message={error ?? undefined} />
      </PatientScreen>
    );
  }

  const { appointments, monitoring, to_discuss: toDiscuss } = profile.care_plan;

  return (
    <PatientScreen isPushedScreen>
      <PatientCard>
        <SectionLabel>Appointments</SectionLabel>
        {appointments.map((appt, i) => (
          <View key={appt.when}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.appointmentRow}>
              <Text style={styles.appointmentWhen}>{appt.when}</Text>
              <Text style={styles.appointmentDetail}>{appt.detail}</Text>
            </View>
          </View>
        ))}
      </PatientCard>

      <PatientCard>
        <SectionLabel>Monitoring at home</SectionLabel>
        {monitoring.map((item) => (
          <View key={item.label} style={styles.monitoringRow}>
            <StatusDot color={ToneColors[item.tone].dot} />
            <Text style={styles.monitoringLabel}>{item.label}</Text>
            <Text style={styles.monitoringCadence}>{item.cadence}</Text>
          </View>
        ))}
      </PatientCard>

      <PatientCard>
        <SectionLabel>To discuss at your visit</SectionLabel>
        {toDiscuss.map((question, i) => (
          <View key={question}>
            {i > 0 && <View style={styles.divider} />}
            <Text style={styles.discussItem}>{question}</Text>
          </View>
        ))}
      </PatientCard>

      <PatientButton label="Add my own question" variant="secondary" />
    </PatientScreen>
  );
}

const styles = StyleSheet.create({
  appointmentRow: {
    gap: 3,
  },
  appointmentWhen: {
    fontSize: 17,
    fontWeight: '600',
    color: PatientColors.ink,
  },
  appointmentDetail: {
    fontSize: 15,
    color: PatientColors.body,
  },
  divider: {
    height: 1,
    backgroundColor: PatientColors.divider,
    marginVertical: 12,
  },
  monitoringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monitoringLabel: {
    flex: 1,
    fontSize: 16,
    color: PatientColors.ink,
  },
  monitoringCadence: {
    fontSize: 14,
    color: PatientColors.textMuted,
  },
  discussItem: {
    fontSize: 16,
    lineHeight: 22.4,
    color: PatientColors.ink,
  },
});
