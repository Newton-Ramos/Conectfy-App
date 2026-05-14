import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Origens típicas do ecossistema Expo (web, tunnel, dev).
 * Desative com CORS_ALLOW_EXPO_HOSTS=false se quiser apenas CORS_ORIGIN.
 */
function isTrustedExpoRelatedOrigin(origin: string): boolean {
  if (process.env.CORS_ALLOW_EXPO_HOSTS === 'false') {
    return false;
  }
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== 'https:' && protocol !== 'http:') {
      return false;
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }
    if (hostname.endsWith('.exp.direct')) {
      return true;
    }
    if (hostname.endsWith('.expo.dev') || hostname === 'expo.dev') {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function buildCorsOptions(): CorsOptions {
  const raw = process.env.CORS_ORIGIN ?? '';
  const explicitOrigins = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    return {
      origin: true,
      credentials: true,
    };
  }

  return {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (explicitOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (isTrustedExpoRelatedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  };
}
