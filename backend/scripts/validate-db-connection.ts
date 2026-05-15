/**
 * Opcional. Preferência: `npm run db:validate`.
 * Manual: npx tsx scripts/validate-db-connection.ts
 */
import 'reflect-metadata';
import dataSource from '../src/data-source';

async function main(): Promise<void> {
  try {
    await dataSource.initialize();
    await dataSource.query('SELECT 1');
    console.log('Conexão com o banco OK.');
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

main().catch((err) => {
  console.error('Falha ao conectar:', err);
  process.exit(1);
});
