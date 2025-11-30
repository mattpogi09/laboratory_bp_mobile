import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import api, {
  TOKEN_STORAGE_KEY,
  setAuthToken,
} from '@/app/services/api';

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
      const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedToken) {
        setToken(storedToken);
        setAuthToken(storedToken);
        const profile = await api.get('/user');
        setUser(profile.data);
      }
    } catch (error) {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
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
      const response = await api.post('/login', {
        username,
        password,
        remember: remember ?? false,
      });

      const receivedToken = response.data.token as string;
      setToken(receivedToken);
      setUser(response.data.user);
      setAuthToken(receivedToken);
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/logout');
    } catch {
      // Ignore network errors during logout to avoid trapping user.
    } finally {
      setUser(null);
      setToken(null);
      setAuthToken(null);
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    const profile = await api.get('/user');
    setUser(profile.data);
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

