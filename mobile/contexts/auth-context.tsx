import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

type AuthContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  signIn: (access_token: string, user: object) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const clearOnStart =
          Constants.expoConfig?.extra &&
          (Constants.expoConfig.extra as { clearAuthOnColdStart?: boolean })
            .clearAuthOnColdStart === true;
        if (clearOnStart) {
          await AsyncStorage.multiRemove(['auth_token', 'user']);
        }
        const token = await AsyncStorage.getItem('auth_token');
        if (!cancelled) {
          setIsAuthenticated(!!token);
          setIsReady(true);
        }
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
          setIsReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (access_token: string, user: object) => {
    await AsyncStorage.setItem('auth_token', access_token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    setIsAuthenticated(true);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove(['auth_token', 'user']);
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ isReady, isAuthenticated, signIn, signOut }),
    [isReady, isAuthenticated, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
