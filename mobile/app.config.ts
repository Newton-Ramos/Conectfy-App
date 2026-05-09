import 'dotenv/config';

/**
 * Mescla com o que veio do `app.json` (`config` já é o objeto Expo mesclado).
 * Retorno “flat” (sem chave `expo`), como na documentação do Expo — assim o
 * prebuild e o expo-doctor reconhecem que o estático foi aplicado.
 */
export default ({ config }: { config: Record<string, unknown> }) => ({
  ...config,
  plugins: [
    ...((config.plugins as unknown[] | undefined) ?? []),
    '@react-native-community/datetimepicker',
  ],
  scheme: (config.scheme as string | undefined) ?? 'mobile',
  extra: {
    ...((config.extra as Record<string, unknown> | undefined) ?? {}),
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  },
});
