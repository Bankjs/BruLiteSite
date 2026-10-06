ALTER TABLE "license_tokens" ADD COLUMN "device_fingerprint" text;--> statement-breakpoint
ALTER TABLE "license_tokens" ADD COLUMN "device_name" text;--> statement-breakpoint
ALTER TABLE "license_tokens" ADD COLUMN "bound_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "device_limit" integer DEFAULT 2 NOT NULL;