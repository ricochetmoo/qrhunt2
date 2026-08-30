ALTER TABLE "games" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "finished_at" timestamp;--> statement-breakpoint
ALTER TABLE "qr_code_scans" ADD COLUMN "result" text DEFAULT 'accepted' NOT NULL;--> statement-breakpoint
ALTER TABLE "qr_code_scans" ADD COLUMN "client_scan_id" text;--> statement-breakpoint
ALTER TABLE "qr_code_scans" ADD COLUMN "client_scanned_at" timestamp;--> statement-breakpoint
ALTER TABLE "qr_code_scans" ADD COLUMN "latitude" text;--> statement-breakpoint
ALTER TABLE "qr_code_scans" ADD COLUMN "longitude" text;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD COLUMN "is_wildcard" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- team_code is required: add nullable, backfill existing teams, then constrain.
ALTER TABLE "teams" ADD COLUMN "team_code" text;--> statement-breakpoint
UPDATE "teams" SET "team_code" = upper(translate(substr(md5(random()::text || id), 1, 6), 01il, WXYZ)) WHERE "team_code" IS NULL;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "team_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "photo_url" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "finished_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "qr_code_scans_team_client_scan_idx" ON "qr_code_scans" USING btree ("team_id","client_scan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qr_code_scans_team_credit_once_idx" ON "qr_code_scans" USING btree ("team_id","qr_code_id") WHERE result in ('accepted', 'wildcard');--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_team_code_unique" UNIQUE("team_code");
