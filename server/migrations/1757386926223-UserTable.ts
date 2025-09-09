import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserTable1757386926223 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "user" (
                "id" SERIAL NOT NULL,
                "firstName" character varying(96) NOT NULL,
                "lastName" character varying(96),
                "email" character varying(96) NOT NULL,
                "password" character varying(96),
                "googleId" character varying,
                CONSTRAINT "UQ_email" UNIQUE ("email"),
                CONSTRAINT "PK_user_id" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
