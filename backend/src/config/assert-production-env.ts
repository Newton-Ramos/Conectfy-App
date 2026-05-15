/**
 * Falha rápido na subida se faltar configuração crítica em produção.
 * Render injeta PORT; DATABASE_URL vem do Postgres anexado.
 */
export function assertProductionEnvironment(): void {
  if (process.env.RENDER === 'true' && process.env.NODE_ENV !== 'production') {
    throw new Error(
      'Render: defina NODE_ENV=production nas variáveis do serviço (CORS, TypeORM e JWT dependem disso).',
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const port = process.env.PORT?.trim();
  if (!port || Number.isNaN(Number(port))) {
    throw new Error(
      'Produção: PORT inválido ou ausente. No Render, PORT é definido automaticamente pelo runtime.',
    );
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  const hasDiscreteDb =
    Boolean(process.env.DB_HOST?.trim()) &&
    Boolean(process.env.DB_USERNAME?.trim()) &&
    Boolean(process.env.DB_NAME?.trim()) &&
    process.env.DB_PASSWORD !== undefined;

  if (!databaseUrl && !hasDiscreteDb) {
    throw new Error(
      'Produção: configure DATABASE_URL (recomendado no Render) ou DB_HOST, DB_USERNAME, DB_PASSWORD e DB_NAME.',
    );
  }

  const jwt = process.env.JWT_SECRET?.trim();
  if (!jwt || jwt.length < 16) {
    throw new Error(
      'Produção: JWT_SECRET é obrigatório e deve ter pelo menos 16 caracteres (use um valor aleatório longo).',
    );
  }

  const sync = process.env.TYPEORM_SYNC?.trim();
  if (sync === 'true') {
    console.warn(
      '[Conectfy] TYPEORM_SYNC=true é ignorado em produção (synchronize desligado). Use migrations (migrationsRun na subida) ou RELEASE: npm run migration:run:prod.',
    );
  }

  if (!process.env.CORS_ORIGIN?.trim()) {
    console.warn(
      '[Conectfy] CORS_ORIGIN vazio: Expo web deve usar hosts *.expo.dev / *.exp.direct (permitidos por padrão). Para outras origens HTTPS, defina CORS_ORIGIN.',
    );
  }
}
