import { Injectable, Logger } from "@nestjs/common";

import { ConfigService } from "../config.service";

export interface OpenRouterRequest {
  model: string;
  temperature: number;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: {
        type: "object";
        properties: Record<string, { type: "string" | "number" | "integer" | "boolean" }>;
        required: string[];
        additionalProperties: boolean;
      };
    };
  };
}

export interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly apiUrl = "https://openrouter.ai/api/v1/chat/completions";

  public constructor(private readonly configService: ConfigService) {}

  public async chat<T>(request: OpenRouterRequest): Promise<T | null> {
    const config = this.configService.getConfig();
    const reqId = Math.random().toString(36).slice(2, 8);

    try {
      this.logger.debug(`[${reqId}] OpenRouter request: ${JSON.stringify(request)}`);

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.openRouterApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        this.logger.warn(`OpenRouter API returned status ${response.status}`);
        return null;
      }

      const json = (await response.json()) as OpenRouterResponse;
      const contentText = json.choices?.[0]?.message?.content ?? "";

      this.logger.debug(`[${reqId}] OpenRouter response: ${contentText}`);

      if (!contentText) {
        this.logger.warn("No content in OpenRouter response");
        return null;
      }

      try {
        return JSON.parse(contentText) as T;
      } catch {
        this.logger.warn("Failed to parse OpenRouter response as JSON");
        return null;
      }
    } catch (error) {
      this.logger.error(`OpenRouter API call failed: ${error}`);
      return null;
    }
  }

  public async chatRaw(request: OpenRouterRequest): Promise<string | null> {
    const config = this.configService.getConfig();
    const reqId = Math.random().toString(36).slice(2, 8);

    try {
      this.logger.debug(`[${reqId}] OpenRouter request: ${JSON.stringify(request)}`);

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.openRouterApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        this.logger.warn(`OpenRouter API returned status ${response.status}`);
        return null;
      }

      const json = (await response.json()) as OpenRouterResponse;
      const contentText = json.choices?.[0]?.message?.content ?? "";

      this.logger.debug(`[${reqId}] OpenRouter response: ${contentText}`);

      return contentText || null;
    } catch (error) {
      this.logger.error(`OpenRouter API call failed: ${error}`);
      return null;
    }
  }
}
