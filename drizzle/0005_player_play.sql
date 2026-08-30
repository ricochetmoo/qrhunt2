CREATE TABLE "game_players" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"user_id" text NOT NULL,
	"joined_via" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
UPDATE "teams" SET "team_code" = upper(translate(substr(md5(random()::text || id), 1, 6), '01il', 'WXYZ')) WHERE "team_code" IS NULL;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "team_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "photo_url" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "finished_at" timestamp;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_players_game_id_user_id_idx" ON "game_players" USING btree ("game_id","user_id");--> statement-breakpoint
CREATE INDEX "game_players_user_id_idx" ON "game_players" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qr_code_scans_team_client_scan_idx" ON "qr_code_scans" USING btree ("team_id","client_scan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qr_code_scans_team_credit_once_idx" ON "qr_code_scans" USING btree ("team_id","qr_code_id") WHERE result in ('accepted', 'wildcard');--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_team_code_unique" UNIQUE("team_code");