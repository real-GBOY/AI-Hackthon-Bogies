import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PatientButton } from '@/components/patient/button';
import { PatientCard } from '@/components/patient/patient-card';
import { PatientScreen } from '@/components/patient/patient-screen';
import { ErrorState, LoadingState } from '@/components/patient/screen-status';
import { PatientColors } from '@/constants/patient-theme';
import { usePatientRiskContext } from '@/context/patient-risk-context';

function formatFeatureName(feature: string): string {
  return feature
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function WhyRiskScreen() {
  const { riskResult, status, error } = usePatientRiskContext();

  if (status === 'loading') {
    return (
      <PatientScreen isPushedScreen>
        <LoadingState label="Loading…" />
      </PatientScreen>
    );
  }

  if (status === 'error' || !riskResult) {
    return (
      <PatientScreen isPushedScreen>
        <ErrorState message={error ?? undefined} />
      </PatientScreen>
    );
  }

  const details = riskResult.driver_details ?? [];

  return (
    <PatientScreen isPushedScreen>
      {details.map((detail, i) => (
        <PatientCard key={detail.feature}>
          <View style={styles.numberedHeader}>
            <Text style={styles.number}>{String(i + 1).padStart(2, '0')}</Text>
            <Text style={styles.featureTitle}>{formatFeatureName(detail.feature)}</Text>
          </View>
          <Text style={styles.description}>{detail.description}</Text>
        </PatientCard>
      ))}

      {details.length === 0 && (
        <PatientCard>
          <Text style={styles.description}>
            {"A detailed breakdown isn't available for this assessment yet — ask your care team to walk " +
              'through it at your next visit.'}
          </Text>
        </PatientCard>
      )}

      <View style={styles.reassuranceCard}>
        <Text style={styles.reassuranceText}>
          None of this is something you caused, and none of it means your pregnancy will go badly. It means
          closer monitoring is the safest plan.
        </Text>
        <PatientButton label="Questions to ask my doctor" variant="secondary" onPress={() => router.push('/care-plan')} />
      </View>
    </PatientScreen>
  );
}

const styles = StyleSheet.create({
  numberedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  number: {
    fontSize: 13,
    fontWeight: '600',
    color: PatientColors.purple,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PatientColors.ink,
  },
  description: {
    fontSize: 16,
    lineHeight: 25.6,
    color: PatientColors.body,
  },
  reassuranceCard: {
    backgroundColor: PatientColors.purpleTintStrong,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  reassuranceText: {
    fontSize: 16,
    lineHeight: 25.6,
    color: PatientColors.textSecondary,
  },
});
