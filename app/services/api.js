import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const TOKEN_STORAGE_KEY = "@bp-mobile-token";
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.91:8000/api";

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

// Track if we're already handling a 401 to prevent cascade clearing
let isHandling401 = false;
let tokenClearedTimestamp = 0;
const TOKEN_CLEAR_COOLDOWN = 5000; // 5 seconds cooldown before clearing token again

// Endpoints that don't require authentication
const PUBLIC_ENDPOINTS = ["/login", "/register", "/forgot-password"];

api.interceptors.request.use(
  async (config) => {
    // Always ensure Authorization header is set from storage or defaults
    const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      config.headers.Authorization = `Bearer ${storedToken}`;
      console.log(
        `[API] Request to ${config.url}: Token attached (length: ${storedToken.length})`,
      );
    } else if (api.defaults.headers.common.Authorization) {
      // Fallback to defaults if storage is empty but defaults are set
      config.headers.Authorization = api.defaults.headers.common.Authorization;
      console.log(`[API] Request to ${config.url}: Using default token`);
    } else {
      // Only warn if this is not a public endpoint
      const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) =>
        config.url?.includes(endpoint),
      );
      if (!isPublicEndpoint) {
        console.warn(`[API] Request to ${config.url}: NO TOKEN AVAILABLE`);
      }
    }
    return config;
  },
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

        console.warn("[API] 401 received - clearing authentication token");

        try {
          await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
          setAuthToken(null);
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
