ALTER TABLE "qr_codes" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "qr_codes_game_id_sort_order_idx" ON "qr_codes" USING btree ("game_id","sort_order");