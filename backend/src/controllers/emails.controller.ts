import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";

import { StoreService } from "../services/db/store.service";
import { EmailProcessingService } from "../services/email/email-processing.service";
import type { ManualEmailInput } from "../types";

@Controller("emails")
export class EmailsController {
  public constructor(
    private readonly storeService: StoreService,
    private readonly emailProcessingService: EmailProcessingService,
  ) {}

  @Get()
  public async listEmails() {
    return this.storeService.listEmails();
  }

  @Get(":id")
  public async getEmail(@Param("id") id: string) {
    const email = await this.storeService.getEmail(id);

    if (!email) {
      throw new NotFoundException("Email not found");
    }

    return email;
  }

  @Post("process")
  public async processManualEmail(@Body() body: ManualEmailInput) {
    return this.emailProcessingService.processManualEmail(body);
  }
}
