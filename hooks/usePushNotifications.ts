import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import api from "@/app/services/api";
import { useAuth } from "@/contexts/AuthContext";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Fix 1: pass projectId so getExpoPushTokenAsync works in production APK builds
const PROJECT_ID: string | undefined =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

async function registerForPushNotifications(): Promise<string | null> {
    if (Platform.OS === "web") return null;

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "Default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#1D4ED8",
        });
    }

    const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    // Fix 1: projectId is required for production builds
    const tokenData = await Notifications.getExpoPushTokenAsync(
        PROJECT_ID ? { projectId: PROJECT_ID } : undefined,
    );
    return tokenData.data;
}

export function usePushNotifications(
    onNotification?: (notification: Notifications.Notification) => void,
    onResponse?: (response: Notifications.NotificationResponse) => void,
) {
    const { isAuthenticated } = useAuth();

    // Fix 2: store callbacks in refs so inline arrow functions in the parent
    // don't cause the effect to re-run and re-register listeners on every render
    const onNotificationRef = useRef(onNotification);
    const onResponseRef = useRef(onResponse);
    useEffect(() => {
        onNotificationRef.current = onNotification;
    }, [onNotification]);
    useEffect(() => {
        onResponseRef.current = onResponse;
    }, [onResponse]);

    const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
    const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

    // Fix 3: track whether we successfully registered a token so we can
    // remove it from the backend when the user logs out
    const tokenRegistered = useRef(false);

    useEffect(() => {
        if (!isAuthenticated) {
            // Fix 3: remove token from backend on logout
            if (tokenRegistered.current) {
                tokenRegistered.current = false;
                api.delete("/staff/push-token").catch(() => {});
            }
            notificationListener.current?.remove();
            responseListener.current?.remove();
            return;
        }

        // Fix 4: cancelled flag guards against resolving after unmount
        let cancelled = false;

        registerForPushNotifications().then((token) => {
            if (!token || cancelled) return;
            api.post("/staff/push-token", {
                token,
                device_platform: Platform.OS === "ios" ? "ios" : "android",
            })
                .then(() => {
                    tokenRegistered.current = true;
                    console.log("[Push] Token saved successfully:", token);
                })
                .catch((err) => {
                    console.error("[Push] Failed to save token:", err?.response?.data ?? err?.message);
                });
        }).catch((err) => {
            console.error("[Push] Failed to get push token:", err?.message ?? err);
        });

        // Fix 2: listeners read from refs — stable references, never stale
        notificationListener.current =
            Notifications.addNotificationReceivedListener((notification) => {
                onNotificationRef.current?.(notification);
            });

        responseListener.current =
            Notifications.addNotificationResponseReceivedListener(
                (response) => {
                    onResponseRef.current?.(response);
                },
            );

        return () => {
            cancelled = true;
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
        // Fix 2: callbacks removed from deps — refs keep them current without re-running
    }, [isAuthenticated]);
}
