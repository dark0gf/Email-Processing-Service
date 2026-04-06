import crypto from "node:crypto";

import { Injectable } from "@nestjs/common";

import { ConfigService } from "../config.service";
import { StoreService } from "../db/store.service";
import { S3Service } from "../aws/s3.service";
import { NotificationService } from "../notifications/notification.service";
import { QuestionClassifierService } from "./classifiers/question-classifier.service";
import { SupplierDetectionService } from "./classifiers/supplier-detection.service";
import { ProcessingStatus } from "../../types";
import type { ManualEmailInput, ParsedEmail } from "../../types";

import { Logger } from "@nestjs/common";

@Injectable()
export class EmailProcessingService {
  private readonly logger = new Logger(EmailProcessingService.name);

  public constructor(
    private readonly configService: ConfigService,
    private readonly storeService: StoreService,
    private readonly s3Service: S3Service,
    private readonly notificationService: NotificationService,
    private readonly questionClassifierService: QuestionClassifierService,
    private readonly supplierDetectionService: SupplierDetectionService,
  ) {}

  public async processParsedEmail(
    email: ParsedEmail,
    rawS3Key?: string,
  ): Promise<{ emailId: string }> {
    this.logger.log(`Starting email processing - MessageID: ${email.messageId}`);
    const existing = await this.storeService.findEmailByMessageId(email.messageId);

    if (existing) {
      this.logger.log(
        `Email already processed (idempotency check) - EmailID: ${existing.id}`,
      );
      return {
        emailId: existing.id,
      };
    }

    this.logger.debug(`Email is new, creating base record`);

    const emailId = crypto.randomUUID();
    this.logger.debug(`Created new email ID: ${emailId}`);
    const baseRecord = await this.storeService.upsertEmail({
      id: emailId,
      messageId: email.messageId,
      from: email.from,
      subject: email.subject,
      bodyText: email.bodyText,
      processingStatus: ProcessingStatus.PROCESSING,
      rawS3Key,
      attachments: email.attachments.map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
      })),
      receivedAt: new Date().toISOString(),
    });
    this.logger.debug(`Base email record created in database`);

    try {
      await Promise.all([
        this.checkForSupplierFiles(baseRecord.id, email),
        this.checkForCustomerServiceQuestion(baseRecord.id, email),
      ]);

      await this.storeService.updateEmailStatus(baseRecord.id, ProcessingStatus.PROCESSED);
    } catch (error) {
      await this.storeService.updateEmailStatus(baseRecord.id, ProcessingStatus.FAILED);
      throw error;
    }

    return {
      emailId: baseRecord.id,
    };
  }

  public async processManualEmail(input: ManualEmailInput): Promise<{ emailId: string }> {
    const email: ParsedEmail = {
      messageId: input.messageId ?? `${Date.now()}@manual.local`,
      from: input.from,
      subject: input.subject,
      bodyText: input.bodyText,
      attachments: (input.attachments ?? []).map((attachment) => {
        const buffer = Buffer.from(attachment.contentBase64, "base64");
        return {
          filename: attachment.filename,
          contentType:
            attachment.contentType ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          content: buffer,
          size: buffer.length,
        };
      }),
    };

    return this.processParsedEmail(email);
  }

  private async checkForSupplierFiles(
    emailId: string,
    email: ParsedEmail,
  ): Promise<void> {
    let supplierFileDetected = false;

    this.logger.log(`Checking ${email.attachments.length} attachment(s) for supplier files`);

    for (const attachment of email.attachments) {
      this.logger.debug(`Analyzing attachment: ${attachment.filename}`);
      const supplierResult = await this.supplierDetectionService.detect(attachment.filename, attachment.content);

      if (!supplierResult.isSupplierFile) {
        this.logger.debug(`Attachment ${attachment.filename} is not a supplier file`);
        continue;
      }

      if (!supplierResult.storedBuffer || !supplierResult.filename) {
        this.logger.warn(`Supplier file detected but missing critical data for ${attachment.filename}`);
        continue;
      }

      this.logger.log(`✓ Valid supplier file detected: ${attachment.filename}`);
      supplierFileDetected = true;

      this.logger.log(`Saving supplier file to S3...`);
      const savedFile = await this.s3Service.saveSupplierFile(supplierResult.filename, supplierResult.storedBuffer);
      this.logger.log(`Supplier file saved to S3: ${savedFile.key}`);

      this.logger.debug(`Saving supplier file metadata to database`);
      await this.storeService.addSupplierFile({
        id: crypto.randomUUID(),
        emailId,
        messageId: email.messageId,
        filename: supplierResult.filename,
        storedAt: savedFile.storedAt,
        storedKey: savedFile.key,
        matchingSheet: supplierResult.matchingSheet ?? "unknown",
        columnMapping: supplierResult.columnMapping ?? {},
        rowCount: supplierResult.rowCount ?? 0,
        previewRows: supplierResult.previewRows ?? [],
        createdAt: new Date().toISOString(),
      });

      this.logger.log(`✓ Supplier file saved`);
    }

    if (!supplierFileDetected) {
      this.logger.debug(`No supplier files detected for email ${email.messageId}`);
    }
  }

  private async checkForCustomerServiceQuestion(
    emailId: string,
    email: Pick<ParsedEmail, "from" | "subject" | "bodyText">,
  ): Promise<void> {
    const customerServiceThreshold = 0.5;
    const customerServiceScore = await this.questionClassifierService.classify(emailId, email.subject, email.bodyText);
    const isCustomerServiceQuestion = customerServiceScore >= customerServiceThreshold;

    this.logger.log(
      `Customer service question score for email ${emailId}: ${customerServiceScore} (threshold: ${customerServiceThreshold})`,
    );
    this.logger.log(`Customer service question classifier result: ${String(isCustomerServiceQuestion)}`);

    if (isCustomerServiceQuestion) {
      this.logger.log(`Email classified as CUSTOMER_SERVICE_QUESTION, sending admin notification...`);
      const notification = await this.notificationService.sendAdminEmail(email.from, email.subject, email.bodyText);
      this.logger.log(
        `Admin notification ${notification.status === "sent" ? "sent" : "failed"}: ${notification.error || "success"}`,
      );

      await this.storeService.addDealQuestion({
        id: crypto.randomUUID(),
        emailId,
        sender: email.from,
        subject: email.subject,
        bodyText: email.bodyText,
        notificationStatus: notification.status,
        notificationError: notification.error,
        notifiedAt: notification.notifiedAt,
        createdAt: new Date().toISOString(),
      });

      this.logger.log(`Customer service question stored`);
    }
  }

  public getHealth(): { ok: true; appEnv: string; serverTimeUtc: string; pollerEnabled: boolean; storageMode: string } {
    const config = this.configService.getConfig();

    return {
      ok: true,
      appEnv: config.appEnv,
      serverTimeUtc: new Date().toISOString(),
      pollerEnabled: Boolean(config.sqsQueueUrl && config.rawEmailBucket),
      storageMode: config.databaseUrl ? "database-configured-but-local-store-active" : "local-json-store",
    };
  }
}
