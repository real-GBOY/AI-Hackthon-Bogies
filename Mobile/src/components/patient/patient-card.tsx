import { StyleSheet, View, type ViewProps } from 'react-native';

import { PatientColors, PatientRadii, PatientShadow, PatientSpacing } from '@/constants/patient-theme';

export function PatientCard({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: PatientColors.card,
    borderRadius: PatientRadii.card,
    padding: PatientSpacing.xl,
    gap: PatientSpacing.md,
    ...PatientShadow,
  },
});
