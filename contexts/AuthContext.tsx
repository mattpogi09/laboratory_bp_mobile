import * as SecureStore from "expo-secure-store";
import {
    PropsWithChildren,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import api, { TOKEN_STORAGE_KEY, setAuthToken } from "@/app/services/api";

const USER_STORAGE_KEY = "bp_mobile_user";

type User = {
    id: number;
    name: string;
    username: string;
    email: string;
    role: string;
};

type AuthContextValue = {
    user: User | null;
    token: string | null;
    initializing: boolean;
    isAuthenticated: boolean;
    login: (payload: {
        username: string;
        password: string;
        remember?: boolean;
    }) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [initializing, setInitializing] = useState(true);

    const hydrate = useCallback(async () => {
        try {
            const storedToken =
                await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
            if (storedToken) {
                setAuthToken(storedToken);
                setToken(storedToken);

                // Restore cached user immediately so the app can render without a network round-trip.
                const storedUser =
                    await SecureStore.getItemAsync(USER_STORAGE_KEY);
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }

                // Refresh profile in the background to pick up any server-side changes.
                try {
                    const profile = await api.get("/user");
                    setUser(profile.data);
                    await SecureStore.setItemAsync(
                        USER_STORAGE_KEY,
                        JSON.stringify(profile.data),
                    );
                } catch {
                    // Network unavailable – cached user data is still valid.
                }
            }
        } catch (error) {
            await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
            await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
            setAuthToken(null);
        } finally {
            setInitializing(false);
        }
    }, []);

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    const login = useCallback(
        async ({
            username,
            password,
            remember,
        }: {
            username: string;
            password: string;
            remember?: boolean;
        }) => {
            console.log("[Auth] Attempting login for:", username);
            try {
                const response = await api.post("/login", {
                    username,
                    password,
                    remember: remember ?? false,
                });

                console.log("[Auth] Login successful");
                const receivedToken = response.data.token as string;
                const receivedUser = response.data.user as User;
                setToken(receivedToken);
                setUser(receivedUser);
                setAuthToken(receivedToken);
                await SecureStore.setItemAsync(
                    TOKEN_STORAGE_KEY,
                    receivedToken,
                );
                await SecureStore.setItemAsync(
                    USER_STORAGE_KEY,
                    JSON.stringify(receivedUser),
                );
            } catch (error: any) {
                console.error("[Auth] Login error:", error.message);
                console.error("[Auth] Error details:", {
                    code: error.code,
                    status: error.response?.status,
                    data: error.response?.data,
                });
                throw error;
            }
        },
        [],
    );

    const logout = useCallback(async () => {
        try {
            await api.post("/logout");
        } catch {
            // Ignore network errors during logout to avoid trapping user.
        } finally {
            setUser(null);
            setToken(null);
            setAuthToken(null);
            await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
            await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        if (!token) return;
        const profile = await api.get("/user");
        setUser(profile.data);
        await SecureStore.setItemAsync(
            USER_STORAGE_KEY,
            JSON.stringify(profile.data),
        );
    }, [token]);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            token,
            initializing,
            isAuthenticated: Boolean(token),
            login,
            logout,
            refreshProfile,
        }),
        [initializing, login, logout, refreshProfile, token, user],
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
