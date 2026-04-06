import { Controller, Get } from "@nestjs/common";

import { StoreService } from "../services/db/store.service";

@Controller("deal-questions")
export class DealQuestionsController {
  public constructor(private readonly storeService: StoreService) {}

  @Get()
  public async listDealQuestions() {
    return this.storeService.listDealQuestions();
  }
}
