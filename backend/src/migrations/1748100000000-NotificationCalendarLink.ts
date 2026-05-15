import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationCalendarLink1748100000000 implements MigrationInterface {
  name = 'NotificationCalendarLink1748100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD COLUMN IF NOT EXISTS "calendarEventId" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications" DROP COLUMN IF EXISTS "calendarEventId"
    `);
  }
}
