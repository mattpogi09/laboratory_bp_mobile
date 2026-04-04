import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';
import { clamp, useResponsiveLayout } from '@/utils';

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  const responsive = useResponsiveLayout();
  const adaptiveSize = clamp(
    Math.round(size * (responsive.isCompact ? 0.92 : responsive.isTablet ? 1.04 : 1)),
    12,
    72
  );

  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name}
      style={[
        {
          width: adaptiveSize,
          height: adaptiveSize,
        },
        style,
      ]}
    />
  );
}
