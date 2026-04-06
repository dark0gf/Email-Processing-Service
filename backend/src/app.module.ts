import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";

import { AppController } from "./controllers/app.controller";
import { EmailsController } from "./controllers/emails.controller";
import { SupplierFilesController } from "./controllers/supplier-files.controller";
import { DealQuestionsController } from "./controllers/deal-questions.controller";
import { AuthController } from "./controllers/auth.controller";
import { ConfigService } from "./services/config.service";
import { StoreService } from "./services/db/store.service";
import { S3Service } from "./services/aws/s3.service";
import { SesService } from "./services/aws/ses.service";
import { SqsService } from "./services/aws/sqs.service";
import { OpenRouterService } from "./services/openrouter/openrouter.service";
import { EmailParserService } from "./services/email/email-parser.service";
import { QuestionClassifierService } from "./services/email/classifiers/question-classifier.service";
import { SupplierDetectionService } from "./services/email/classifiers/supplier-detection.service";
import { NotificationService } from "./services/notifications/notification.service";
import { EmailProcessingService } from "./services/email/email-processing.service";
import { PollerService } from "./services/email/poller.service";
import { AuthService } from "./services/auth/auth.service";
import { AuthMiddleware } from "./middleware/auth.middleware";

@Module({
  controllers: [
    AppController,
    AuthController,
    EmailsController,
    SupplierFilesController,
    DealQuestionsController,
  ],
  providers: [
    ConfigService,
    StoreService,
    S3Service,
    SesService,
    SqsService,
    OpenRouterService,
    EmailParserService,
    QuestionClassifierService,
    SupplierDetectionService,
    NotificationService,
    EmailProcessingService,
    PollerService,
    AuthService,
  ],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: "health", method: RequestMethod.GET },
        { path: "auth/login", method: RequestMethod.POST },
        { path: "auth/refresh", method: RequestMethod.POST },
      )
      .forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
