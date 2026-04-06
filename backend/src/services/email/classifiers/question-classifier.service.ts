import { Injectable, Logger } from "@nestjs/common";

import { ConfigService } from "../../config.service";
import { OpenRouterService } from "../../openrouter/openrouter.service";

const customerServiceKeywords = [
  "customer service",
  "support",
  "help",
  "issue",
  "problem",
  "question",
  "complaint",
  "refund",
  "return",
  "cancel",
  "replacement",
  "damaged",
  "missing",
  "late",
  "order status",
  "tracking",
  "delivery",
  "shipment",
  "shipping",
  "order",
];

@Injectable()
export class QuestionClassifierService {
  private readonly logger = new Logger(QuestionClassifierService.name);

  public constructor(
    private readonly configService: ConfigService,
    private readonly openRouterService: OpenRouterService,
  ) {}

  public async classify(emailId: string, subject: string, bodyText: string): Promise<number> {
    const content = `${subject}\n${bodyText}`.toLowerCase();
    const keywordHits = customerServiceKeywords.filter((keyword) => content.includes(keyword));

    if (keywordHits.length >= 2) {
      this.logger.log(`Customer service classification score for email ${emailId}: 1`);
      return 1;
    }

    const config = this.configService.getConfig();

    const parsed = await this.openRouterService.chat<{ score?: number; comment?: string }>({
      model: config.openRouterModel,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Classify whether the inbound email contains a deal question. Return only the score between 0 and 1 where 0 means definitely not a deal question and 1 means definitely a deal question. Score highly when the sender is asking about deal terms, pricing, discounts, order status, shipping or delivery, refunds, returns, cancellations, replacements, complaints, or similar customer service assistance related to a deal.",
        },
        {
          role: "user",
          content: `Subject: ${subject}\n\nBody:\n${bodyText}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "customer_service_question_score",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number" },
              comment: { type: "string" },
            },
            required: ["score"],
            additionalProperties: false,
          },
        },
      },
    });

    if (!parsed || typeof parsed.score !== "number" || Number.isNaN(parsed.score)) {
      return 0;
    }

    const score = Math.max(0, Math.min(1, parsed.score));

    if (typeof parsed.comment === "string" && parsed.comment.trim().length > 0) {
      this.logger.debug(
        `Customer service classification comment for email ${emailId}: ${parsed.comment}`,
      );
    }

    this.logger.log(`Customer service classification score for email ${emailId}: ${score}`);

    return score;
  }
}
