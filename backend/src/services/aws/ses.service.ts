import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { Injectable } from "@nestjs/common";

import { ConfigService } from "../config.service";
import type { NotificationStatus } from "../../types";
import { createAwsClientConfig } from "./client-config";

@Injectable()
export class SesService {
  private readonly client: SESv2Client | null;

  private readonly adminEmail?: string;

  private readonly fromEmail?: string;

  public constructor(configService: ConfigService) {
    const config = configService.getConfig();
    this.adminEmail = config.adminEmail;
    this.fromEmail = config.sesFromEmail;
    this.client = this.adminEmail && this.fromEmail ? new SESv2Client(createAwsClientConfig(config.awsRegion)) : null;
  }

  public async sendAdminNotification(subject: string, bodyText: string): Promise<{
    status: NotificationStatus;
    error?: string;
    notifiedAt?: string;
  }> {
    if (!this.client || !this.adminEmail || !this.fromEmail) {
      return {
        status: "skipped",
        error: "SES notification disabled because ADMIN_EMAIL or SES_FROM_EMAIL is missing",
      };
    }

    try {
      await this.client.send(
        new SendEmailCommand({
          FromEmailAddress: this.fromEmail,
          Destination: {
            ToAddresses: [this.adminEmail],
          },
          Content: {
            Simple: {
              Subject: { Data: subject },
              Body: { Text: { Data: bodyText } },
            },
          },
        }),
      );

      return {
        status: "sent",
        notifiedAt: new Date().toISOString(),
      };
    } catch (error) {
      const rawError = error instanceof Error ? error.message : "Unknown SES error";
      const lowerError = rawError.toLowerCase();
      const isIdentityVerificationError =
        lowerError.includes("email address is not verified") || lowerError.includes("identity") && lowerError.includes("failed the check");

      return {
        status: "failed",
        error: isIdentityVerificationError
          ? `${rawError}. Verify sender/recipient identities in SES for this region or request production access to leave SES sandbox.`
          : rawError,
      };
    }
  }
}
