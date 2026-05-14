import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useAuth } from '@/contexts/auth-context';

/** Mesmo verde da splash nativa — evita flash branco atrás do overlay enquanto o auth inicializa. */
const ROOT_SPLASH_BG = '#0F3D3E';

export default function Index() {
  const { isReady, isAuthenticated } = useAuth();

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: ROOT_SPLASH_BG }} />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return <Redirect href="/(tabs)" />;
}
