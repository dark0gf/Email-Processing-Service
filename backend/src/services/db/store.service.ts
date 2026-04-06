import { desc, eq } from "drizzle-orm";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Pool } from "pg";

import { dealQuestions, emails, supplierFiles } from "./schema";
import { createDbClient } from "./pg";
import { ConfigService } from "../config.service";
import type {
  DealQuestionRecord,
  EmailRecord,
  ProcessingStatus,
  SupplierFileRecord,
} from "../../types";

@Injectable()
export class StoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StoreService.name);
  private pool: Pool | null = null;
  private db: ReturnType<typeof createDbClient>["db"] | null = null;

  public constructor(private readonly configService: ConfigService) {}

  public async onModuleInit(): Promise<void> {
    const config = this.configService.getConfig();

    if (!config.databaseUrl) {
      this.logger.warn("DATABASE_URL not set, operating without database");
      return;
    }

    try {
      const { db, pool } = createDbClient(config.databaseUrl);
      this.db = db;
      this.pool = pool;
      await this.pool.query("SELECT 1");
      this.logger.log("Connected to PostgreSQL database");
    } catch (error) {
      this.logger.error(`Failed to connect to database: ${error}`);
      this.db = null;
      this.pool = null;
      throw error;
    }
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.db = null;
    }
  }

  public async listEmails(): Promise<EmailRecord[]> {
    const db = this.getDB();
    const rows = await db.select().from(emails).orderBy(desc(emails.receivedAt)).limit(20);

    return rows.map((row) => this.mapEmailRow(row));
  }

  public async getEmail(id: string): Promise<EmailRecord | undefined> {
    const db = this.getDB();
    const [row] = await db.select().from(emails).where(eq(emails.id, id));

    return row ? this.mapEmailRow(row) : undefined;
  }

  public async findEmailByMessageId(messageId: string): Promise<EmailRecord | undefined> {
    const db = this.getDB();
    const [row] = await db.select().from(emails).where(eq(emails.messageId, messageId));

    return row ? this.mapEmailRow(row) : undefined;
  }

  public async upsertEmail(input: Omit<EmailRecord, "createdAt" | "updatedAt">): Promise<EmailRecord> {
    const db = this.getDB();

    const timestamp = new Date().toISOString();

    const [row] = await db
      .insert(emails)
      .values({
        id: input.id,
        messageId: input.messageId,
        from: input.from,
        subject: input.subject,
        bodyText: input.bodyText,
        processingStatus: input.processingStatus,
        rawS3Key: input.rawS3Key,
        attachments: input.attachments,
        receivedAt: input.receivedAt,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: emails.messageId,
        set: {
          from: input.from,
          subject: input.subject,
          bodyText: input.bodyText,
          processingStatus: input.processingStatus,
          rawS3Key: input.rawS3Key,
          attachments: input.attachments,
          updatedAt: timestamp,
        },
      })
      .returning();

    return this.mapEmailRow(row);
  }

  public async updateEmailStatus(id: string, processingStatus: ProcessingStatus): Promise<void> {
    const db = this.getDB();

    const timestamp = new Date().toISOString();

    await db
      .update(emails)
      .set({ processingStatus, updatedAt: timestamp })
      .where(eq(emails.id, id));
  }

  public async addSupplierFile(record: SupplierFileRecord): Promise<void> {
    const db = this.getDB();

    await db.insert(supplierFiles).values({
      id: record.id,
      emailId: record.emailId,
      messageId: record.messageId,
      filename: record.filename,
      storedAt: record.storedAt,
      storedKey: record.storedKey,
      matchingSheet: record.matchingSheet,
      columnMapping: record.columnMapping,
      rowCount: record.rowCount,
      previewRows: record.previewRows,
      createdAt: record.createdAt,
    });
  }

  public async listSupplierFiles(): Promise<SupplierFileRecord[]> {
    const db = this.getDB();
    const rows = await db.select().from(supplierFiles).orderBy(desc(supplierFiles.createdAt)).limit(20);

    return rows.map((row) => this.mapSupplierFileRow(row));
  }

  public async addDealQuestion(record: DealQuestionRecord): Promise<void> {
    const db = this.getDB();

    await db.insert(dealQuestions).values({
      id: record.id,
      emailId: record.emailId,
      sender: record.sender,
      subject: record.subject,
      bodyText: record.bodyText,
      notificationStatus: record.notificationStatus,
      notificationError: record.notificationError,
      notifiedAt: record.notifiedAt,
      createdAt: record.createdAt,
    });
  }

  public async listDealQuestions(): Promise<DealQuestionRecord[]> {
    const db = this.getDB();
    const rows = await db.select().from(dealQuestions).orderBy(desc(dealQuestions.createdAt)).limit(20);

    return rows.map((row) => this.mapDealQuestionRow(row));
  }

  public async getDatabaseHealth(): Promise<{ configDatabaseUrlSet: boolean; connected: boolean; error?: string }> {
    const config = this.configService.getConfig();

    if (!config.databaseUrl) {
      return {
        configDatabaseUrlSet: false,
        connected: false,
      };
    }

    if (!this.pool) {
      return {
        configDatabaseUrlSet: true,
        connected: false,
        error: "Database pool is not initialized",
      };
    }

    try {
      await this.pool.query("SELECT 1");
      return {
        configDatabaseUrlSet: true,
        connected: true,
      };
    } catch (error) {
      return {
        configDatabaseUrlSet: true,
        connected: false,
        error: error instanceof Error ? error.message : "Unknown database connection error",
      };
    }
  }

  private getDB(): NonNullable<ReturnType<typeof createDbClient>["db"]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return this.db;
  }

  private mapEmailRow(row: typeof emails.$inferSelect): EmailRecord {
    return {
      id: row.id,
      messageId: row.messageId,
      from: row.from,
      subject: row.subject,
      bodyText: row.bodyText,
      processingStatus: row.processingStatus,
      rawS3Key: row.rawS3Key ?? undefined,
      attachments: row.attachments,
      receivedAt: row.receivedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapSupplierFileRow(row: typeof supplierFiles.$inferSelect): SupplierFileRecord {
    return {
      id: row.id,
      emailId: row.emailId,
      messageId: row.messageId,
      filename: row.filename,
      storedAt: row.storedAt,
      storedKey: row.storedKey,
      matchingSheet: row.matchingSheet,
      columnMapping: row.columnMapping,
      rowCount: row.rowCount,
      previewRows: row.previewRows,
      createdAt: row.createdAt,
    };
  }

  private mapDealQuestionRow(row: typeof dealQuestions.$inferSelect): DealQuestionRecord {
    return {
      id: row.id,
      emailId: row.emailId,
      sender: row.sender,
      subject: row.subject,
      bodyText: row.bodyText,
      notificationStatus: row.notificationStatus,
      notificationError: row.notificationError ?? undefined,
      notifiedAt: row.notifiedAt ?? undefined,
      createdAt: row.createdAt,
    };
  }
}
