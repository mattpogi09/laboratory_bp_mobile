import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

const COMPACT_WIDTH = 360;
const TABLET_WIDTH = 768;

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}

export function useResponsiveLayout() {
    const { width, height, fontScale } = useWindowDimensions();

    return useMemo(() => {
        const isCompact = width < COMPACT_WIDTH;
        const isTablet = width >= TABLET_WIDTH;
        const horizontalPadding = isTablet ? 24 : isCompact ? 14 : 20;
        const contentWidth = Math.max(0, width - horizontalPadding * 2);

        return {
            width,
            height,
            fontScale,
            isCompact,
            isTablet,
            horizontalPadding,
            contentWidth,
        };
    }, [width, height, fontScale]);
}