import { Pressable, StyleSheet, Text } from 'react-native';

import { PatientColors } from '@/constants/patient-theme';

interface ChevronRowProps {
  title: string;
  detail?: string;
  onPress?: () => void;
  showChevron?: boolean;
  isLast?: boolean;
}

export function ChevronRow({ title, detail, onPress, showChevron = true, isLast = false }: ChevronRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !isLast && styles.divider, pressed && onPress && styles.pressed]}>
      <Text style={styles.title}>{title}</Text>
      {detail && <Text style={styles.detail}>{detail}</Text>}
      {showChevron && <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 18,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PatientColors.divider,
  },
  pressed: {
    backgroundColor: PatientColors.overlayTint,
  },
  title: {
    flex: 1,
    fontSize: 16,
    color: PatientColors.ink,
  },
  detail: {
    fontSize: 14.5,
    color: PatientColors.textMuted,
  },
  chevron: {
    fontSize: 22,
    color: PatientColors.chevron,
  },
});
