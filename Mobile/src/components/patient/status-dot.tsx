import { StyleSheet, View, type ViewProps } from 'react-native';

interface StatusDotProps extends ViewProps {
  color: string;
  size?: number;
}

export function StatusDot({ color, size = 8, style, ...rest }: StatusDotProps) {
  return (
    <View
      style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    flexShrink: 0,
  },
});
