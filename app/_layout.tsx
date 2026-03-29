import { Stack } from "expo-router";
import * as Updates from "expo-updates";
import React, { useCallback, useEffect, useState } from "react";
import { Animated, Text, View } from "react-native";

import { AuthProvider } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";

function UpdateBanner() {
    const [message, setMessage] = useState("");
    const opacity = React.useRef(new Animated.Value(0)).current;

    const show = (msg: string) => {
        setMessage(msg);
        Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const hide = () => {
        Animated.timing(opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
        }).start();
    };

    useEffect(() => {
        if (__DEV__) return; // skip in development

        async function checkForUpdate() {
            try {
                const result = await Updates.checkForUpdateAsync();
                if (result.isAvailable) {
                    show("Downloading update...");
                    await Updates.fetchUpdateAsync();
                    show("Update ready — restart the app to apply");
                    setTimeout(hide, 4000);
                }
            } catch {
                // silently ignore update errors
            }
        }

        checkForUpdate();
    }, []);

    if (!message) return null;

    return (
        <Animated.View
            style={{
                opacity,
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 999,
                backgroundColor: "#1D4ED8",
                paddingVertical: 8,
                paddingHorizontal: 16,
            }}
        >
            <Text style={{ color: "#fff", fontSize: 13, textAlign: "center" }}>
                {message}
            </Text>
        </Animated.View>
    );
}

function PushNotificationSetup() {
    const onResponse = useCallback((response: any) => {
        // Navigate based on notification data when user taps a notification
        const data = response.notification.request.content.data ?? {};
        if (data.transaction_id) {
            // Future: router.push to transaction detail
        }
    }, []);

    usePushNotifications(undefined, onResponse);
    return null;
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <PushNotificationSetup />
            <UpdateBanner />
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: "#ffffff" },
                    headerTintColor: "#111827",
                }}
            >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen
                    name="(drawer)"
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="patients/[id]"
                    options={{
                        title: "Patient Details",
                        headerBackTitle: "Back",
                        presentation: "card",
                    }}
                />
                <Stack.Screen
                    name="reconciliation/[id]"
                    options={{
                        headerShown: false,
                        presentation: "card",
                    }}
                />
            </Stack>
        </AuthProvider>
    );
}
