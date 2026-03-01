import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";

import api from "@/app/services/api";
import { useAuth } from "@/contexts/AuthContext";

type NotificationContextValue = {
    unreadCount: number;
    refreshCount: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue>({
    unreadCount: 0,
    refreshCount: async () => {},
});

const POLL_INTERVAL_MS = 60_000;

export function NotificationProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);

    const clearInterval_ = useCallback(() => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const fetchCount = useCallback(async () => {
        try {
            const res = await api.get("/mobile/notifications/unread-count");
            // Support both {count: n} and {unread_count: n} response shapes
            const n =
                res.data?.count ??
                res.data?.unread_count ??
                res.data?.unread ??
                0;
            setUnreadCount(Number(n));
        } catch {
            // Badge is best-effort — silently ignore network errors
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            clearInterval_();
            setUnreadCount(0);
            return;
        }

        // Initial fetch + start polling
        fetchCount();
        intervalRef.current = setInterval(fetchCount, POLL_INTERVAL_MS);

        const subscription = AppState.addEventListener(
            "change",
            (nextState: AppStateStatus) => {
                const wasBackground =
                    appStateRef.current.match(/inactive|background/);
                const isNowActive = nextState === "active";
                const isNowBackground = nextState.match(/inactive|background/);

                if (wasBackground && isNowActive) {
                    // App came to foreground — resume polling
                    clearInterval_();
                    fetchCount();
                    intervalRef.current = setInterval(
                        fetchCount,
                        POLL_INTERVAL_MS,
                    );
                } else if (isNowBackground) {
                    // App went to background — pause polling
                    clearInterval_();
                }

                appStateRef.current = nextState;
            },
        );

        return () => {
            clearInterval_();
            subscription.remove();
        };
    }, [isAuthenticated, fetchCount, clearInterval_]);

    return (
        <NotificationContext.Provider
            value={{ unreadCount, refreshCount: fetchCount }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotificationBadge = () => useContext(NotificationContext);
