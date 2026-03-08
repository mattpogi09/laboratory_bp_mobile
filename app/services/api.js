import axios from "axios";
import * as SecureStore from "expo-secure-store";

export const TOKEN_STORAGE_KEY = "bp_mobile_token";
export const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.254.102:8000/api";

console.log("[API] Initializing with base URL:", API_BASE_URL);

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
    timeout: 1000 * 30,
});

export const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common.Authorization;
    }
};

// Callback invoked when the session is definitively expired (401 with a token).
// Set by AuthContext so it can update React state and navigate to login.
let _onUnauthenticated = null;
export const setUnauthenticatedHandler = (handler) => {
    _onUnauthenticated = handler;
};

// Track if we're already handling a 401 to prevent cascade clearing
let isHandling401 = false;
let tokenClearedTimestamp = 0;
const TOKEN_CLEAR_COOLDOWN = 5000; // 5 seconds cooldown before clearing token again

// NOTE: The request interceptor is intentionally synchronous.
// A previous version used `await SecureStore.getItemAsync()` here, which could
// hang indefinitely on certain devices/OS states, causing API calls to never
// resolve and producing an infinite loading spinner.
// Token injection is handled by setAuthToken(), which keeps
// api.defaults.headers.common.Authorization in sync. Axios automatically
// includes that header on every request without needing an interceptor.
api.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error),
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            const now = Date.now();

            // Only clear token if:
            // 1. We're not already handling a 401
            // 2. Enough time has passed since last token clear (to prevent cascade)
            // 3. This is a request that had a token (not a request that failed because there was no token)
            const hadToken = !!error.config?.headers?.Authorization;
            const shouldClearToken =
                !isHandling401 &&
                hadToken &&
                now - tokenClearedTimestamp > TOKEN_CLEAR_COOLDOWN;

            if (shouldClearToken) {
                isHandling401 = true;
                tokenClearedTimestamp = now;

                console.warn(
                    "[API] 401 received - clearing authentication token",
                );

                try {
                    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
                    setAuthToken(null);
                    // Notify AuthContext so it can clear React state and redirect to login.
                    if (_onUnauthenticated) _onUnauthenticated();
                } catch (clearError) {
                    console.error("[API] Failed to clear token:", clearError);
                } finally {
                    // Reset the flag after a short delay to allow other pending requests to complete
                    setTimeout(() => {
                        isHandling401 = false;
                    }, 1000);
                }
            } else if (!hadToken) {
                console.warn(
                    "[API] 401 received but request had no token - not clearing",
                );
            } else {
                console.warn(
                    "[API] 401 received but skipping token clear (already handling or cooldown)",
                );
            }
        }
        return Promise.reject(error);
    },
);

export default api;
