ALTER TABLE "releases" ADD COLUMN "platform" text DEFAULT 'universal' NOT NULL;--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN "artifact_type" text DEFAULT 'bundle' NOT NULL;