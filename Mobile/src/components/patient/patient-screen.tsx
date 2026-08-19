import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { PatientColors, PatientTabBarClearance } from '@/constants/patient-theme';

interface PatientScreenProps extends ScrollViewProps {
  /** Set false for tab-root screens (that sit under the floating pill tab bar and need clearance for it); true for pushed/stack screens that own the full screen. */
  isPushedScreen?: boolean;
}

/**
 * Shared scroll container for every patient-app screen: safe-area aware,
 * consistent horizontal rhythm, and the design's #F5F5F7 screen background.
 */
export function PatientScreen({ isPushedScreen = false, style, contentContainerStyle, children, ...rest }: PatientScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scroll, style]}
        contentContainerStyle={[
          styles.content,
          {
            // Pushed screens already sit below a native header that reserves
            // the top inset itself; adding insets.top again here would
            // double-count it and leave an oversized gap under the header.
            paddingTop: isPushedScreen ? Spacing.three : insets.top + Spacing.three,
            paddingBottom: isPushedScreen ? insets.bottom + Spacing.four : insets.bottom + PatientTabBarClearance,
          },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        {...rest}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PatientColors.screenBackground,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
});
