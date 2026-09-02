CREATE TABLE "feedback_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"fun_score" integer,
	"comments" text,
	"keep_updated" boolean DEFAULT false NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"contact_role" text,
	"additional_info" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_responses_fun_score_range" CHECK ("feedback_responses"."fun_score" is null or ("feedback_responses"."fun_score" between 1 and 10))
);
--> statement-breakpoint
ALTER TABLE "qr_codes" ADD COLUMN "fun_fact" text;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD COLUMN "is_completion" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "reported_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "prize_issued_at" timestamp;--> statement-breakpoint
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_responses_game_id_idx" ON "feedback_responses" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "feedback_responses_team_id_idx" ON "feedback_responses" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_responses_team_user_idx" ON "feedback_responses" USING btree ("team_id","user_id");