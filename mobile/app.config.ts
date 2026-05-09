import 'dotenv/config';

export default ({ config }: { config: any }) => ({
  ...config,
  expo: {
    ...(config.expo ?? {}),
    plugins: [
      ...(config.expo?.plugins ?? config.plugins ?? []),
      '@react-native-community/datetimepicker',
    ],
    // preserva o scheme do app.json (ou define um padrão seguro)
    scheme: (config.expo?.scheme ?? config.scheme ?? 'mobile') as string,
    extra: {
      ...(config.expo?.extra ?? config.extra ?? {}),
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
    },
  },
});