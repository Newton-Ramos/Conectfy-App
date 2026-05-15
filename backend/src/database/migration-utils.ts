import type { QueryRunner } from 'typeorm';

/** Postgres não tem CREATE TYPE IF NOT EXISTS — ignora se o enum já existir (ex.: schema via sync). */
export async function createPostgresEnumIfNotExists(
  queryRunner: QueryRunner,
  name: string,
  values: readonly string[],
): Promise<void> {
  const labels = values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ');
  await queryRunner.query(`
    DO $$ BEGIN
      CREATE TYPE "${name}" AS ENUM (${labels});
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
}
