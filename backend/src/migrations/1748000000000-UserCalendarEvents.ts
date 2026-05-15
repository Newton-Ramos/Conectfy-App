import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserCalendarEvents1748000000000 implements MigrationInterface {
  name = 'UserCalendarEvents1748000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_calendar_events" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "title" character varying(200) NOT NULL,
        "notes" text,
        "dateAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_calendar_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_calendar_events_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_calendar_events_user_date"
      ON "user_calendar_events" ("userId", "dateAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_calendar_events"`);
  }
}
