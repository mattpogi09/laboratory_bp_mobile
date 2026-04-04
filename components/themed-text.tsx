import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { clamp, useResponsiveLayout } from '@/utils';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const responsive = useResponsiveLayout();
  const sizeScale = responsive.isCompact ? 0.94 : responsive.isTablet ? 1.05 : 1;

  const scaled = (size: number, min: number, max: number) =>
    clamp(Math.round(size * sizeScale), min, max);

  const responsiveTypeStyle =
    type === 'default'
      ? { fontSize: scaled(16, 14, 19), lineHeight: scaled(24, 20, 28) }
      : type === 'defaultSemiBold'
        ? { fontSize: scaled(16, 14, 19), lineHeight: scaled(24, 20, 28) }
        : type === 'title'
          ? { fontSize: scaled(32, 28, 36), lineHeight: scaled(32, 30, 38) }
          : type === 'subtitle'
            ? { fontSize: scaled(20, 18, 24) }
            : type === 'link'
              ? { fontSize: scaled(16, 14, 19), lineHeight: scaled(30, 24, 34) }
              : undefined;

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        responsiveTypeStyle,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
