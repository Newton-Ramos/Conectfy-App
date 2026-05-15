import type { ClientConfig } from 'pg';

/**
 * Configuração do cliente `pg` para scripts (seed, etc.).
 * Usa DATABASE_URL (Render) ou DB_HOST / DB_* (local).
 */
export function readPgClientConfig(): ClientConfig {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    const local = /localhost|127\.0\.0\.1/.test(url) || url.includes('sslmode=disable');
    return {
      connectionString: url,
      ssl: local ? false : { rejectUnauthorized: false },
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || process.env.DB_PASS,
    database: process.env.DB_NAME || 'conectfy',
  };
}
