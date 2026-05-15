import { MigrationInterface, QueryRunner } from 'typeorm';
import { createPostgresEnumIfNotExists } from '../database/migration-utils';

export class InitialSchema1747248000000 implements MigrationInterface {
  name = 'InitialSchema1747248000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await createPostgresEnumIfNotExists(queryRunner, 'messages_status_enum', [
      'sent',
      'delivered',
      'read',
    ]);
    await createPostgresEnumIfNotExists(queryRunner, 'messages_media_type_enum', [
      'text',
      'image',
      'voice',
      'video',
      'document',
      'file',
    ]);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL NOT NULL,
        "nome" character varying NOT NULL,
        "email" character varying NOT NULL,
        "cpf" character varying(11),
        "dataNascimento" date,
        "cep" character varying(8),
        "logradouro" character varying(120),
        "numero" character varying(20),
        "complemento" character varying(60),
        "bairro" character varying(80),
        "cidade" character varying(80),
        "uf" character varying(2),
        "localidade" character varying(120),
        "notas" text,
        "circulos" jsonb,
        "afinidades" jsonb,
        "senha" character varying(72),
        "passwordResetToken" character varying(128),
        "passwordResetExpires" TIMESTAMP,
        "googleId" character varying(64),
        "facebookId" character varying(64),
        "instagramId" character varying(64),
        "criadoEm" TIMESTAMP NOT NULL DEFAULT now(),
        "lastSeenAt" TIMESTAMP,
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_cpf" UNIQUE ("cpf"),
        CONSTRAINT "UQ_users_googleId" UNIQUE ("googleId"),
        CONSTRAINT "UQ_users_facebookId" UNIQUE ("facebookId"),
        CONSTRAINT "UQ_users_instagramId" UNIQUE ("instagramId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_contacts" (
        "user_id" integer NOT NULL,
        "contact_id" integer NOT NULL,
        "telefone" character varying,
        "nota" text,
        "is_blocked" boolean NOT NULL DEFAULT false,
        "tags" jsonb,
        CONSTRAINT "PK_user_contacts" PRIMARY KEY ("user_id", "contact_id"),
        CONSTRAINT "FK_user_contacts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_user_contacts_contact" FOREIGN KEY ("contact_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" SERIAL NOT NULL,
        "senderId" integer NOT NULL,
        "receiverId" integer NOT NULL,
        "content" text NOT NULL,
        "status" "messages_status_enum" NOT NULL DEFAULT 'sent',
        "read_at" TIMESTAMP,
        "deliveredAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "editedAt" TIMESTAMP,
        "deletedAt" TIMESTAMP,
        "parentMessageId" integer,
        "mediaType" "messages_media_type_enum" NOT NULL DEFAULT 'text',
        "mediaUrl" text,
        "mediaDurationSec" integer,
        CONSTRAINT "PK_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_parent" FOREIGN KEY ("parentMessageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_messages_sender_receiver_created"
      ON "messages" ("senderId", "receiverId", "createdAt")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "message_reactions" (
        "id" SERIAL NOT NULL,
        "messageId" integer NOT NULL,
        "userId" integer NOT NULL,
        "emoji" character varying(16) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_message_reactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_message_reactions_message_user" UNIQUE ("messageId", "userId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" SERIAL NOT NULL,
        "userId" integer,
        "title" character varying NOT NULL,
        "body" text,
        "grupo" character varying(16) NOT NULL DEFAULT 'hoje',
        "kind" character varying(24) NOT NULL DEFAULT 'sistema',
        "eventAt" TIMESTAMP,
        "rsvpStatus" character varying(8),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "message_reactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_contacts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "messages_media_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "messages_status_enum"`);
  }
}
