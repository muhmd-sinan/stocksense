DROP INDEX "categories_shop_name_uq";--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_shop_name_live_uq" ON "categories" USING btree ("shop_id",lower("name")) WHERE "categories"."deleted_at" is null;