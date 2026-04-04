import Animated from 'react-native-reanimated';
import { useResponsiveLayout } from '@/utils';

export function HelloWave() {
  const responsive = useResponsiveLayout();
  const waveSize = responsive.isTablet ? 30 : responsive.isCompact ? 24 : 28;

  return (
    <Animated.Text
      style={{
        fontSize: waveSize,
        lineHeight: waveSize + 4,
        marginTop: responsive.isCompact ? -4 : -6,
        animationName: {
          '50%': { transform: [{ rotate: '25deg' }] },
        },
        animationIterationCount: 4,
        animationDuration: '300ms',
      }}>
      👋
    </Animated.Text>
  );
}
