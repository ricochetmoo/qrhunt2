DROP INDEX "account_provider_account_idx";--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "issuer" text DEFAULT 'local:credential' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_account_idx" ON "account" USING btree ("issuer","account_id");