import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { PatientColors, PatientRadii } from '@/constants/patient-theme';

type Variant = 'primary' | 'secondary' | 'purple' | 'danger';

interface PatientButtonProps extends PressableProps {
  label: string;
  variant?: Variant;
  pill?: boolean;
}

const VARIANT_STYLES: Record<Variant, { bg: string; text: string }> = {
  primary: { bg: PatientColors.ink, text: PatientColors.white },
  secondary: { bg: PatientColors.overlayTint, text: PatientColors.ink },
  purple: { bg: PatientColors.purple, text: PatientColors.white },
  danger: { bg: PatientColors.red, text: PatientColors.white },
};

export function PatientButton({ label, variant = 'primary', pill = false, style, disabled, ...rest }: PatientButtonProps) {
  const colors = VARIANT_STYLES[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.base,
        { backgroundColor: colors.bg, borderRadius: pill ? PatientRadii.chip : PatientRadii.control },
        disabled && styles.disabled,
        state.pressed && !disabled && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
