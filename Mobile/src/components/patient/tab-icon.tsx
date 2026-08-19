import Svg, { Circle, Path } from 'react-native-svg';

export type TabIconName = 'home' | 'risk' | 'timeline' | 'learn' | 'ask';

interface TabIconProps {
  name: TabIconName;
  color: string;
  size?: number;
}

/**
 * Small hand-drawn line icons for the pill tab bar — kept as plain
 * react-native-svg paths (already a dependency for RiskRing) rather than a
 * platform icon font, so the tab bar looks identical on iOS, Android, and
 * web instead of depending on each platform's own symbol set.
 */
export function TabIcon({ name, color, size = 22 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {ICON_PATHS[name].map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {name === 'timeline' && <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={1.8} />}
      {name === 'risk' && <Circle cx={12} cy={15.5} r={1.3} stroke={color} strokeWidth={1.8} />}
    </Svg>
  );
}

const ICON_PATHS: Record<TabIconName, string[]> = {
  home: ['M4 11.5 12 4l8 7.5', 'M6 10.3V19a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-8.7'],
  risk: ['M4.5 15.5a7.5 7.5 0 0 1 15 0', 'M12 15.5 16 9.6'],
  timeline: ['M12 7.5V12l3 2'],
  learn: [
    'M4 5.6C4 4.7 4.7 4 5.6 4H12v16H5.6A1.6 1.6 0 0 1 4 18.4V5.6Z',
    'M20 5.6c0-.9-.7-1.6-1.6-1.6H12v16h6.4c.9 0 1.6-.7 1.6-1.6V5.6Z',
  ],
  ask: ['M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v6.4a2.8 2.8 0 0 1-2.8 2.8H10l-4.5 4v-4H6.8A2.8 2.8 0 0 1 4 13.2V6.8Z'],
};
