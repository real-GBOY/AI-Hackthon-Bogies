import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { PatientColors } from '@/constants/patient-theme';

/**
 * Shared loading/error presentation for screens whose content comes from
 * PatientProfileProvider/PatientRiskProvider — every screen that dropped its
 * mock-data fallback needs one of these instead of assuming data is always
 * present. Renders inside a PatientScreen's content, not as a full-screen
 * takeover, so the header above it stays visible.
 */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={PatientColors.purple} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  message = "Couldn't load your information. Check your connection and try again.",
}: {
  message?: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.four * 2,
    alignItems: 'center',
    gap: Spacing.two,
  },
  loadingText: {
    fontSize: 14,
    color: PatientColors.textMuted,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22.5,
    color: PatientColors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
});
