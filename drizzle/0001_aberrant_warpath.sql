CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner_user_id" text NOT NULL,
	"timezone" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"work_start_minutes" integer NOT NULL,
	"work_end_minutes" integer NOT NULL,
	"step_minutes" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"approved_date" date,
	"approved_slot" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_step_minutes_check" CHECK ("event"."step_minutes" in (30, 60)),
	CONSTRAINT "event_status_check" CHECK ("event"."status" in ('open', 'approved'))
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_ownerUserId_idx" ON "event" USING btree ("owner_user_id");