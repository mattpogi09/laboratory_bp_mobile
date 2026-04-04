import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useResponsiveLayout } from '@/utils';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');
  const responsive = useResponsiveLayout();

  const constrainedStyle =
    responsive.width >= 1200
      ? { width: '100%', maxWidth: 1100, alignSelf: 'center' as const }
      : undefined;

  return <View style={[{ backgroundColor, minWidth: 0 }, constrainedStyle, style]} {...otherProps} />;
}
