import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';

WebBrowser.maybeCompleteAuthSession();

const INSTAGRAM_AUTH = 'https://api.instagram.com/oauth/authorize';

/** true se houver algum client ID do Google (usado para não montar o hook sem credenciais). */
export function isGoogleOAuthConfigured(): boolean {
  return !!(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim()
  );
}

export function useGoogleLogin() {
  const webId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const androidId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();
  const iosId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  // `invariantClientId` só aceita `undefined` como “faltando”; string vazia não dispara erro.
  // Sem .env, usamos '' em cada plataforma para a tela renderizar; login social fica desligado na UI.
  const resolved = webId || androidId || iosId || '';
  return Google.useIdTokenAuthRequest({
    webClientId: webId ?? '',
    androidClientId: androidId || resolved,
    iosClientId: iosId || resolved,
    scopes: ['openid', 'profile', 'email'],
  });
}

export function useFacebookLogin() {
  const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';
  return Facebook.useAuthRequest({
    clientId: facebookAppId,
  });
}

/** Instagram Basic Display: abre login e devolve `code` para o backend trocar pelo secret. */
export async function openInstagramLogin(): Promise<{ code: string; redirectUri: string } | null> {
  const appId = process.env.EXPO_PUBLIC_INSTAGRAM_APP_ID;
  if (!appId) {
    throw new Error('INSTAGRAM_APP_ID não configurado');
  }
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'mobile',
    path: 'instagram',
  });
  const url =
    `${INSTAGRAM_AUTH}?client_id=${encodeURIComponent(appId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=user_profile&response_type=code`;
  const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);
  if (result.type !== 'success' || !('url' in result) || !result.url) {
    return null;
  }
  const parsed = new URL(result.url);
  const code = parsed.searchParams.get('code');
  const err = parsed.searchParams.get('error');
  if (err) {
    throw new Error(parsed.searchParams.get('error_description') ?? err);
  }
  if (!code) {
    return null;
  }
  return { code, redirectUri };
}
