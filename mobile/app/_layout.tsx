import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SplashOverlay } from '@/components/Splash';
import { SPLASH_MIN_MS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync().catch(() => {
  // no-op: pode falhar em alguns fluxos (ex.: hot reload)
});

/**
 * Não usar `anchor: '(tabs)'` aqui — isso faz o Router privilegiar as Tabs na entrada e briga com o fluxo Auth → Welcome → Login.
 */

/**
 * Corrige só rotas “furadas” (ex.: deep link ou estado restaurado em /(tabs) sem token).
 * A rota `index` já faz <Redirect/> — não chamar replace aqui para evitar loop/flicker.
 */
function AuthNavigationSync() {
  const { isReady, isAuthenticated } = useAuth();
  const navState = useRootNavigationState();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isReady || !navState?.key) return;

    const root = segments[0] ? String(segments[0]) : '';
    const inAuthGroup = root === '(auth)';
    const atIndex = root === 'index' || root === '';

    if (!isAuthenticated) {
      if (atIndex) return;
      if (!inAuthGroup) {
        router.replace('/(auth)/welcome');
      }
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isReady, isAuthenticated, navState?.key, router, segments]);

  return null;
}

function SplashGate({ children }: { children: ReactNode }) {
  const { isReady } = useAuth();
  const mountedAt = useRef(Date.now());
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [renderOverlay, setRenderOverlay] = useState(true);

  /**
   * Evita “flash” branco: segura o splash nativo até o overlay JS
   * ter sido montado e pelo menos 1 frame ter sido pintado.
   */
  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void SplashScreen.hideAsync();
      });
    });
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const elapsed = Date.now() - mountedAt.current;
    const remaining = Math.max(0, SPLASH_MIN_MS - elapsed);
    const t = setTimeout(() => setOverlayVisible(false), remaining);
    return () => clearTimeout(t);
  }, [isReady]);

  return (
    <>
      {children}
      {renderOverlay ? (
        <SplashOverlay
          visible={overlayVisible}
          onDismissComplete={() => setRenderOverlay(false)}
        />
      ) : null}
    </>
  );
}

/** Fundo do navigator alinhado à splash — evita área branca + texto “sumindo” no tema claro. */
const NAV_BRAND_BG = '#0F3D3E';

function RootStack() {
  const colorScheme = useColorScheme();

  const navigationTheme = useMemo(() => {
    const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: NAV_BRAND_BG,
      },
    };
  }, [colorScheme]);

  return (
    <ThemeProvider value={navigationTheme}>
      <AuthNavigationSync />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: NAV_BRAND_BG },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0F3D3E' }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SplashGate>
            <RootStack />
          </SplashGate>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
