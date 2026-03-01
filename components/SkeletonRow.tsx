import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

type SkeletonRowProps = {
    /** Number of skeleton cards to render. Defaults to 6. */
    count?: number;
};

const SHIMMER_DURATION = 850;

function Bar({
    width,
    height = 13,
}: {
    width: string | number;
    height?: number;
}) {
    return (
        <View
            style={[
                styles.bar,
                { width: width as any, height, borderRadius: height / 2 },
            ]}
        />
    );
}

function Card({ anim }: { anim: Animated.Value }) {
    const opacity = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.35, 0.85],
    });

    return (
        <Animated.View style={[styles.card, { opacity }]}>
            {/* Title row */}
            <View style={styles.row}>
                <Bar width="55%" height={16} />
                <Bar width="22%" height={13} />
            </View>
            {/* Subtitle */}
            <Bar width="38%" height={12} />
            {/* Info row */}
            <View style={styles.row}>
                <Bar width="45%" height={12} />
                <Bar width="30%" height={12} />
            </View>
            {/* Detail line */}
            <Bar width="68%" height={11} />
        </Animated.View>
    );
}

export function SkeletonRow({ count = 6 }: SkeletonRowProps) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, {
                    toValue: 1,
                    duration: SHIMMER_DURATION,
                    useNativeDriver: true,
                }),
                Animated.timing(anim, {
                    toValue: 0,
                    duration: SHIMMER_DURATION,
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [anim]);

    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <Card key={i} anim={anim} />
            ))}
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        gap: 10,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    bar: {
        backgroundColor: "#E5E7EB",
    },
});
