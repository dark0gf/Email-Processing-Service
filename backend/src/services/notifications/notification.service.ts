import { Injectable } from "@nestjs/common";

import { SesService } from "../aws/ses.service";

@Injectable()
export class NotificationService {
  public constructor(private readonly sesService: SesService) {}

  public async sendAdminEmail(
    sender: string,
    subject: string,
    bodyText: string,
  ): Promise<{ status: "sent" | "failed" | "skipped"; error?: string; notifiedAt?: string }> {
    const notificationSubject = `Customer service question: ${subject}`;
    const notificationBody = `Sender: ${sender}\n\nSubject: ${subject}\n\nBody:\n${bodyText}`;
    return this.sesService.sendAdminNotification(notificationSubject, notificationBody);
  }
}
