import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

import { ConfigService } from "../config.service";
import { SqsService } from "../aws/sqs.service";
import { S3Service } from "../aws/s3.service";
import { EmailParserService } from "./email-parser.service";
import { EmailProcessingService } from "./email-processing.service";

interface S3EventPayload {
  Records?: Array<{
    s3?: {
      object?: {
        key?: string;
      };
    };
  }>;
}

function decodeS3Key(key: string): string {
  return decodeURIComponent(key.replace(/\+/g, " "));
}

@Injectable()
export class PollerService implements OnModuleInit {
  private readonly logger = new Logger(PollerService.name);

  public constructor(
    private readonly configService: ConfigService,
    private readonly sqsService: SqsService,
    private readonly s3Service: S3Service,
    private readonly emailParserService: EmailParserService,
    private readonly emailProcessingService: EmailProcessingService,
  ) {}

  public onModuleInit(): void {
    const config = this.configService.getConfig();

    if (!this.sqsService.isConfigured() || !this.s3Service.isConfigured()) {
      this.logger.log(
        `SQS poller disabled for ${config.appEnv} because SQS_QUEUE_URL or RAW_EMAIL_BUCKET is missing`,
      );
      return;
    }

    this.logger.log(`Starting SQS poller for ${config.appEnv}`);
    void this.poll();
  }

  private async poll(): Promise<void> {
    try {
      const messages = await this.sqsService.receive();

      for (const message of messages) {
        try {
          this.logger.debug("Processing SQS message...");
          const payload = JSON.parse(message.body) as S3EventPayload;
          const keys = payload.Records?.map((record) => record.s3?.object?.key).filter(
            (value): value is string => Boolean(value),
          );

          if (!keys || keys.length === 0) {
            this.logger.warn("SQS message contains no S3 object keys");
            await this.sqsService.delete(message.receiptHandle);
            continue;
          }

          this.logger.debug(`Processing ${keys.length} S3 object key(s) from SQS message`);

          for (const encodedKey of keys) {
            try {
              const key = decodeS3Key(encodedKey);
              this.logger.debug(`Fetching raw email from S3: ${key}`);
              const rawEmail = await this.s3Service.getRawEmail(key);
              this.logger.debug("Raw email fetched, parsing...");
              const parsedEmail = await this.emailParserService.parseRawEmail(rawEmail);
              this.logger.debug(
                `Email parsed - MessageID: ${parsedEmail.messageId}, From: ${parsedEmail.from}, Subject: ${parsedEmail.subject}`,
              );
              this.logger.debug(`Email has ${parsedEmail.attachments.length} attachment(s)`);
              const result = await this.emailProcessingService.processParsedEmail(parsedEmail, key);
              this.logger.log(`Email processed successfully - EmailID: ${result.emailId}`);
            } catch (keyError) {
              this.logger.error(
                `Error processing S3 key ${encodedKey}: ${keyError instanceof Error ? keyError.message : String(keyError)}`,
                keyError instanceof Error ? keyError.stack : undefined,
              );
            }
          }

          this.logger.debug("Deleting message from SQS...");
          await this.sqsService.delete(message.receiptHandle);
          this.logger.debug("SQS message deleted successfully");
        } catch (messageError) {
          this.logger.error(
            `Error processing SQS message: ${messageError instanceof Error ? messageError.message : String(messageError)}`,
            messageError instanceof Error ? messageError.stack : undefined,
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `SQS poller error: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (errorMessage.includes("ExpiredToken")) {
        this.logger.error(
          "AWS credentials are expired. Refresh the configured AWS profile or remove stale AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_SESSION_TOKEN environment variables before restarting the backend.",
        );
      }
    } finally {
      setTimeout(() => {
        void this.poll();
      }, 1000);
    }
  }
}
