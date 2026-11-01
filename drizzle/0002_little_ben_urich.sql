CREATE TABLE "availability" (
	"participant_id" uuid NOT NULL,
	"date" date NOT NULL,
	"slot_number" integer NOT NULL,
	CONSTRAINT "availability_participant_id_date_slot_number_pk" PRIMARY KEY("participant_id","date","slot_number")
);
--> statement-breakpoint
CREATE TABLE "participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"guest_id" text,
	"user_id" text,
	"name" text NOT NULL,
	"saved_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "participant_identity_check" CHECK (("participant"."guest_id" is not null) <> ("participant"."user_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant" ADD CONSTRAINT "participant_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant" ADD CONSTRAINT "participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "participant_eventId_idx" ON "participant" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "participant_userId_idx" ON "participant" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_event_guest_unique" ON "participant" USING btree ("event_id","guest_id") WHERE "participant"."guest_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "participant_event_user_unique" ON "participant" USING btree ("event_id","user_id") WHERE "participant"."user_id" is not null;