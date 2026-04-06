CREATE TABLE "deal_questions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email_id" uuid NOT NULL,
	"sender" varchar(255) NOT NULL,
	"subject" text NOT NULL,
	"body_text" text NOT NULL,
	"notification_status" varchar(50) NOT NULL,
	"notification_error" text,
	"notified_at" timestamp,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" uuid PRIMARY KEY NOT NULL,
	"message_id" varchar(255) NOT NULL,
	"from_address" varchar(255) NOT NULL,
	"subject" text NOT NULL,
	"body_text" text NOT NULL,
	"classification" varchar(50) NOT NULL,
	"processing_status" varchar(50) NOT NULL,
	"raw_s3_key" varchar(255),
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"received_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_files" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email_id" uuid NOT NULL,
	"message_id" varchar(255) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"stored_at" varchar(50) NOT NULL,
	"stored_key" varchar(255) NOT NULL,
	"matching_sheet" varchar(255) NOT NULL,
	"column_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"preview_rows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deal_questions" ADD CONSTRAINT "deal_questions_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_files" ADD CONSTRAINT "supplier_files_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_deal_questions_email_id" ON "deal_questions" USING btree ("email_id");--> statement-breakpoint
CREATE INDEX "idx_deal_questions_created_at" ON "deal_questions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "emails_message_id_unique" ON "emails" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_emails_received_at" ON "emails" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "idx_emails_message_id" ON "emails" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_files_email_id" ON "supplier_files" USING btree ("email_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_files_created_at" ON "supplier_files" USING btree ("created_at");