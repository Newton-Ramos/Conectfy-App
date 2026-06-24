import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

type DbEnvGetter = (key: string) => string | undefined;

function trim(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
}

function isLocalDatabaseUrl(url: string): boolean {
  return (
    /localhost|127\.0\.0\.1/.test(url) || url.includes('sslmode=disable')
  );
}

/**
 * Indica se a conexão aponta para um banco local. Usado para impedir que o
 * `synchronize` do TypeORM rode contra um banco remoto/produção (ex.: Render),
 * o que pode recriar enums/colunas e corromper dados reais.
 */
export function isLocalDatabase(get: DbEnvGetter): boolean {
  const databaseUrl = trim(get('DATABASE_URL'));
  if (databaseUrl) {
    return isLocalDatabaseUrl(databaseUrl);
  }
  const host = trim(get('DB_HOST'));
  return host === undefined || host === 'localhost' || host === '127.0.0.1';
}

export function readTypeOrmConnectionOptions(
  get: DbEnvGetter,
): Omit<PostgresConnectionOptions, 'entities' | 'migrations'> {
  const databaseUrl = trim(get('DATABASE_URL'));
  const nodeEnv = trim(get('NODE_ENV'));
  const isProd = nodeEnv === 'production';

  const base: Omit<PostgresConnectionOptions, 'entities' | 'migrations'> = {
    type: 'postgres',
    synchronize: false,
    logging: isProd ? ['error'] : false,
  };

  if (databaseUrl) {
    const local = isLocalDatabaseUrl(databaseUrl);
    const ssl =
      local
        ? false
        : { rejectUnauthorized: false as const };
    return {
      ...base,
      url: databaseUrl,
      ssl,
    };
  }

  const host = trim(get('DB_HOST'));
  if (!host) {
    throw new Error(
      'Configuração de banco ausente: defina DATABASE_URL ou DB_HOST (com DB_NAME, usuário e senha).',
    );
  }

  const portRaw = trim(get('DB_PORT')) ?? '5432';
  const username =
    trim(get('DB_USER')) ?? trim(get('DB_USERNAME')) ?? 'postgres';
  const password =
    trim(get('DB_PASS')) ?? trim(get('DB_PASSWORD')) ?? undefined;
  const database = trim(get('DB_NAME'));
  if (!database) {
    throw new Error('DB_NAME é obrigatório quando não se usa DATABASE_URL.');
  }

  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  const ssl = isLocalHost
    ? false
    : { rejectUnauthorized: false as const };

  return {
    ...base,
    host,
    port: parseInt(portRaw, 10),
    username,
    password,
    database,
    ssl,
  };
}
