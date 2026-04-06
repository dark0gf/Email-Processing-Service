import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import type { NotificationStatus, ProcessedAttachment, ProcessingStatus } from "../../types";

export const emails = pgTable(
  "emails",
  {
    id: uuid("id").primaryKey(),
    messageId: varchar("message_id", { length: 255 }).notNull(),
    from: varchar("from_address", { length: 255 }).notNull(),
    subject: text("subject").notNull(),
    bodyText: text("body_text").notNull(),
    processingStatus: varchar("processing_status", { length: 50 }).$type<ProcessingStatus>().notNull(),
    rawS3Key: varchar("raw_s3_key", { length: 255 }),
    attachments: jsonb("attachments").$type<ProcessedAttachment[]>().notNull().default(sql`'[]'::jsonb`),
    receivedAt: timestamp("received_at", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("emails_message_id_unique").on(table.messageId),
    index("idx_emails_received_at").on(table.receivedAt),
    index("idx_emails_message_id").on(table.messageId),
  ],
);

export const supplierFiles = pgTable(
  "supplier_files",
  {
    id: uuid("id").primaryKey(),
    emailId: uuid("email_id").notNull().references(() => emails.id),
    messageId: varchar("message_id", { length: 255 }).notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    storedAt: varchar("stored_at", { length: 50 }).$type<"s3" | "local">().notNull(),
    storedKey: varchar("stored_key", { length: 255 }).notNull(),
    matchingSheet: varchar("matching_sheet", { length: 255 }).notNull(),
    columnMapping: jsonb("column_mapping").$type<Record<string, string>>().notNull().default(sql`'{}'::jsonb`),
    rowCount: integer("row_count").notNull().default(0),
    previewRows: jsonb("preview_rows")
      .$type<Array<Record<string, string | number | null>>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { mode: "string" }).notNull(),
  },
  (table) => [index("idx_supplier_files_email_id").on(table.emailId), index("idx_supplier_files_created_at").on(table.createdAt)],
);

export const dealQuestions = pgTable(
  "deal_questions",
  {
    id: uuid("id").primaryKey(),
    emailId: uuid("email_id").notNull().references(() => emails.id),
    sender: varchar("sender", { length: 255 }).notNull(),
    subject: text("subject").notNull(),
    bodyText: text("body_text").notNull(),
    notificationStatus: varchar("notification_status", { length: 50 }).$type<NotificationStatus>().notNull(),
    notificationError: text("notification_error"),
    notifiedAt: timestamp("notified_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).notNull(),
  },
  (table) => [index("idx_deal_questions_email_id").on(table.emailId), index("idx_deal_questions_created_at").on(table.createdAt)],
);
