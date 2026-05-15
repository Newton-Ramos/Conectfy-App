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

export type AuthUser = {
  id: number;
  nome: string;
  email: string;
};

type AuthContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  signIn: (access_token: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
};

function parseStoredUser(raw: string | null): AuthUser | null {
  if (!raw) return null;
  try {
    const u = JSON.parse(raw) as Partial<AuthUser>;
    if (typeof u.id === 'number' && typeof u.email === 'string' && typeof u.nome === 'string') {
      return { id: u.id, email: u.email, nome: u.nome };
    }
  } catch {
    /* ignore */
  }
  return null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

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
        const [token, rawUser] = await Promise.all([
          AsyncStorage.getItem('auth_token'),
          AsyncStorage.getItem('user'),
        ]);
        if (!cancelled) {
          setIsAuthenticated(!!token);
          setUser(parseStoredUser(rawUser));
          setIsReady(true);
        }
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
          setUser(null);
          setIsReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (access_token: string, nextUser: AuthUser) => {
    await AsyncStorage.setItem('auth_token', access_token);
    await AsyncStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
    setIsAuthenticated(true);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove(['auth_token', 'user']);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ isReady, isAuthenticated, user, signIn, signOut }),
    [isReady, isAuthenticated, user, signIn, signOut],
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
