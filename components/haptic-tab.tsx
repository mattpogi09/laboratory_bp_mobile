import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { useResponsiveLayout } from '@/utils';

export function HapticTab(props: BottomTabBarButtonProps) {
  const responsive = useResponsiveLayout();

  return (
    <PlatformPressable
      {...props}
      hitSlop={props.hitSlop ?? (responsive.isCompact ? { top: 8, right: 8, bottom: 8, left: 8 } : undefined)}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
