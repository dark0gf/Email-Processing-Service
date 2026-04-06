import { Injectable } from "@nestjs/common";

import { AppConfig, loadConfig } from "../config";

@Injectable()
export class ConfigService {
  private readonly config: AppConfig = loadConfig();

  public getConfig(): AppConfig {
    return this.config;
  }
}
