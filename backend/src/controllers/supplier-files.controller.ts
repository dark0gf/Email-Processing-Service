import { Controller, Get } from "@nestjs/common";

import { StoreService } from "../services/db/store.service";

@Controller("supplier-files")
export class SupplierFilesController {
  public constructor(private readonly storeService: StoreService) {}

  @Get()
  public async listSupplierFiles() {
    return this.storeService.listSupplierFiles();
  }
}
