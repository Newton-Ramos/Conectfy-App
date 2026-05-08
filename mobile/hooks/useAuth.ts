import * as WebBrowser from 'expo-web-browser';
import * as Facebook from 'expo-auth-session/providers/facebook';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { auth } from '@/api/client';
import { useAuth as useAuthContext } from '@/contexts/auth-context';

WebBrowser.maybeCompleteAuthSession();

/**
 * Fluxo Mobile: abre login Facebook e troca o token pelo JWT do Conectfy.
 * Importante: não confundir com `useAuth()` do contexto (aqui usamos `useAuthContext`).
 */
export function useAuth() {
  const router = useRouter();
  const { signIn } = useAuthContext();
  const [loading, setLoading] = useState(false);

  const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';

  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: facebookAppId,
  });

  useEffect(() => {
    const run = async () => {
      if (response?.type !== 'success') return;
      const accessToken =
        response.authentication?.accessToken ?? response.params?.access_token;
      if (!accessToken) return;

      setLoading(true);
      try {
        const res = await auth.facebookToken(accessToken);
        await signIn(res.data.access_token, res.data.user);
        router.replace('/(tabs)' as any);
      } catch (e: any) {
        Alert.alert(
          'Facebook',
          e?.response?.data?.message ?? e?.message ?? 'Falha no login social',
        );
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [response, router, signIn]);

  const isLoading = useMemo(() => loading || !request, [loading, request]);

  return {
    signInWithFacebook: () => promptAsync(),
    isLoading,
  };
}

