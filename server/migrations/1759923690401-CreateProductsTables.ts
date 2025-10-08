import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductsTables1759923690401 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(128) NOT NULL UNIQUE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_types (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(128) NOT NULL UNIQUE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        description text NOT NULL,
        price_cents bigint NOT NULL DEFAULT 0,
        picture_url text NOT NULL,
        brand_id uuid NULL REFERENCES brands(id) ON DELETE SET NULL,
        brand_name varchar(128) NULL,
        type_id uuid NULL REFERENCES product_types(id) ON DELETE SET NULL,
        type_name varchar(128) NULL,
        quantity_in_stock int NOT NULL DEFAULT 0,
        public_id varchar(255) NULL,
        search_vector tsvector NULL,
        version int NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_products_price_cents ON products(price_cents);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_products_quantity_in_stock ON products(quantity_in_stock);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_products_search_gin ON products USING GIN (search_vector);`,
    );

    await queryRunner.query(`
      CREATE FUNCTION products_search_vector_trigger() RETURNS trigger AS $$
      begin
        NEW.search_vector :=
          to_tsvector('simple', coalesce(NEW.name,'') || ' ' || coalesce(NEW.description,''));
        return NEW;
      end
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
      ON products FOR EACH ROW EXECUTE PROCEDURE products_search_vector_trigger();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS tsvectorupdate ON products;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS products_search_vector_trigger();`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS products;`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_types;`);
    await queryRunner.query(`DROP TABLE IF EXISTS brands;`);
  }
}
