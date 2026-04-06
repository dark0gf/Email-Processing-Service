import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { Injectable, Logger } from "@nestjs/common";

import { ConfigService } from "../config.service";
import { createAwsClientConfig } from "./client-config";

export interface QueueMessage {
  receiptHandle: string;
  body: string;
}

@Injectable()
export class SqsService {
  private readonly logger = new Logger(SqsService.name);
  private readonly client: SQSClient | null;

  private readonly queueUrl?: string;

  public constructor(configService: ConfigService) {
    const config = configService.getConfig();
    this.queueUrl = config.sqsQueueUrl;
    this.client = this.queueUrl ? new SQSClient(createAwsClientConfig(config.awsRegion)) : null;
    this.logger.debug(`SQS Service initialized for queue: ${this.queueUrl || "(not configured)"}`);
  }

  public isConfigured(): boolean {
    return Boolean(this.client && this.queueUrl);
  }

  public async receive(): Promise<QueueMessage[]> {
    if (!this.client || !this.queueUrl) {
      this.logger.debug("SQS receive called but client or queue URL not configured");
      return [];
    }

    this.logger.debug(`Receiving messages from SQS queue (max 5, wait 20s)`);
    const response = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 5,
        WaitTimeSeconds: 20,
      }),
    );

    const messages = (response.Messages ?? [])
      .filter((message): message is Required<Pick<typeof message, "Body" | "ReceiptHandle">> => {
        return Boolean(message.Body && message.ReceiptHandle);
      })
      .map((message) => ({
        body: message.Body,
        receiptHandle: message.ReceiptHandle,
      }));

    if (messages.length > 0) {
      this.logger.log(`Received ${messages.length} message(s) from SQS`);
    } else {
      this.logger.debug("No messages received from SQS");
    }

    return messages;
  }

  public async delete(receiptHandle: string): Promise<void> {
    if (!this.client || !this.queueUrl) {
      this.logger.warn("Attempted to delete SQS message but client or queue URL not configured");
      return;
    }

    try {
      await this.client.send(
        new DeleteMessageCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: receiptHandle,
        }),
      );
      this.logger.debug("Successfully deleted message from SQS");
    } catch (error) {
      this.logger.error(`Failed to delete message from SQS: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
