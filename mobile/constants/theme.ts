/**
 * Tema base + constantes da splash interativa (Conectfy).
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Tempo mínimo da splash JS alinhado ao gate em `app/_layout.tsx`. */
export const SPLASH_MIN_MS = 2800;

export const APP_VERSION =
  Constants.expoConfig?.version ?? (Constants.nativeAppVersion as string | undefined) ?? '1.0.0';

/** Prompt para gerar variações visuais (splash, banners, ícones). */
export const CONNECTFY_SPLASH_GENERATION_PROMPT =
  "High-quality splash screen design for a modern tech app called 'Conectfy'. The design should feature a futuristic logo representing connectivity and community, using a palette of deep blues, cyans, and vibrant oranges. Background should be a dark, professional gradient with subtle network node patterns. Cinematic lighting, 8k resolution, minimalist but sophisticated tech aesthetic.";

/** Paleta da splash / identidade escura (slate + azul + ciano + laranja). */
export const COLORS = {
  background: '#020617',
  primary: '#3b82f6',
  secondary: '#22d3ee',
  accent: '#fb923c',
  text: '#f1f5f9',
} as const;

/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
