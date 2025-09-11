import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthAuditTable1757572853366 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "auth_audit" (
        "id" SERIAL PRIMARY KEY,
        "userId" INT NULL,
        "ip" VARCHAR(45) NOT NULL,
        "deviceId" VARCHAR(96) NULL,
        "event" VARCHAR(64) NOT NULL,
        "success" BOOLEAN DEFAULT FALSE,
        "refreshTokenId" VARCHAR(64) NULL,
        "timestamp" TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth_audit"`);
  }
}
