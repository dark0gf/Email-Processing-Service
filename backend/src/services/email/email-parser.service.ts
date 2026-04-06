import { Injectable } from "@nestjs/common";
import { simpleParser } from "mailparser";

import type { ParsedEmail } from "../../types";

@Injectable()
export class EmailParserService {
  public async parseRawEmail(rawEmail: Buffer): Promise<ParsedEmail> {
    const parsed = await simpleParser(rawEmail);
    const fromValue = parsed.from?.value[0]?.address;


    return {
      messageId: parsed.messageId ?? `generated-${Date.now()}`,
      from: fromValue,
      subject: parsed.subject ?? "(no subject)",
      bodyText: parsed.text?.trim() ?? "",
      html: typeof parsed.html === "string" ? parsed.html : undefined,
      attachments: parsed.attachments.map((attachment) => ({
        filename: attachment.filename ?? "attachment.bin",
        contentType: attachment.contentType,
        content: attachment.content,
        size: attachment.size,
      })),
    };
  }
}
