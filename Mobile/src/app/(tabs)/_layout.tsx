import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { usePathname, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabIcon, type TabIconName } from '@/components/patient/tab-icon';
import { PatientColors, PatientRadii } from '@/constants/patient-theme';

interface TabDef {
  name: string;
  href: Href;
  icon: TabIconName;
  label: string;
}

const TABS: TabDef[] = [
  { name: 'index', href: '/', icon: 'home', label: 'Home' },
  { name: 'risk', href: '/risk', icon: 'risk', label: 'My risk' },
  { name: 'timeline', href: '/timeline', icon: 'timeline', label: 'Timeline' },
  { name: 'learn', href: '/learn', icon: 'learn', label: 'Learn' },
  { name: 'ask', href: '/ask', icon: 'ask', label: 'Ask' },
];

/**
 * A custom floating pill tab bar (expo-router/ui's JS tab primitives, not
 * NativeTabs) so the bar looks identical — and fits five compact icon+label
 * buttons cleanly — on iOS, Android, and web alike, rather than depending on
 * each platform's own tab-bar chrome.
 */
export default function PatientTabsLayout() {
  return (
    <Tabs>
      <TabSlot />
      <TabList asChild>
        <PillDock>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon} label={tab.label} />
            </TabTrigger>
          ))}
        </PillDock>
      </TabList>
    </Tabs>
  );
}

/**
 * `<TabList asChild>` only unwraps exactly one JSX layer when it scans for
 * `TabTrigger`s (it walks the element tree as written, before any component
 * runs — see expo-router/build/ui/Tabs.js's parseTriggersFromChildren). So
 * the TabTriggers passed to this component must stay its direct JSX
 * children; the extra dock/pill wrapper Views needed for the floating-pill
 * look live inside this component's own render, which the scanner never
 * looks inside.
 */
function PillDock({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const hidden = pathname === '/ask';
  return (
    <View
      style={[styles.dock, { paddingBottom: insets.bottom + 8 }, hidden && styles.dockHidden]}
      pointerEvents={hidden ? 'none' : 'box-none'}>
      <View style={styles.pill}>{children}</View>
    </View>
  );
}

function TabButton({
  icon,
  label,
  isFocused,
  ...props
}: TabTriggerSlotProps & { icon: TabIconName; label: string }) {
  const color = isFocused ? PatientColors.purple : PatientColors.textFaint;
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}>
      <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
        <TabIcon name={icon} color={color} size={21} />
      </View>
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  dockHidden: {
    display: 'none',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PatientColors.card,
    borderRadius: PatientRadii.chip,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
    shadowColor: PatientColors.black,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    paddingVertical: 6,
    gap: 3,
    borderRadius: 16,
  },
  tabButtonPressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 36,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  iconWrapActive: {
    backgroundColor: PatientColors.purpleTint,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
