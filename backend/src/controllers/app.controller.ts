import { Controller, Get } from "@nestjs/common";

import { ConfigService } from "../services/config.service";
import { StoreService } from "../services/db/store.service";

@Controller()
export class AppController {
  public constructor(
    private readonly configService: ConfigService,
    private readonly storeService: StoreService,
  ) {}

  @Get("health")
  public async getHealth() {
    const config = this.configService.getConfig();
    const database = await this.storeService.getDatabaseHealth();

    return {
      appEnv: config.appEnv,
      serverTimeUtc: new Date().toISOString(),
      database,
    };
  }
}
