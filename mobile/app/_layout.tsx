import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

function RootStack() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthNavigationSync />
      <Stack>
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootStack />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
