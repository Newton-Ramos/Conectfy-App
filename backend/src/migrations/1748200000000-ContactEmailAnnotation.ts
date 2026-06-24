import { MigrationInterface, QueryRunner } from 'typeorm';

export class ContactEmailAnnotation1748200000000 implements MigrationInterface {
  name = 'ContactEmailAnnotation1748200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_contacts"
      ADD COLUMN IF NOT EXISTS "email" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_contacts" DROP COLUMN IF EXISTS "email"
    `);
  }
}
