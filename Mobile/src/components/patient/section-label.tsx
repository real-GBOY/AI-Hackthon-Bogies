import { StyleSheet, Text, type TextProps } from 'react-native';

import { PatientColors } from '@/constants/patient-theme';

interface SectionLabelProps extends TextProps {
  tone?: 'muted' | 'purple';
}

export function SectionLabel({ style, tone = 'muted', ...rest }: SectionLabelProps) {
  return <Text style={[styles.base, tone === 'purple' && styles.purple, style]} {...rest} />;
}

const styles = StyleSheet.create({
  base: {
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: PatientColors.textFaint,
  },
  purple: {
    color: PatientColors.purpleDark,
  },
});
