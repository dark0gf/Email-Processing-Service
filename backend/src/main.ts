import "reflect-metadata";

import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { createAwsClientConfig, describeAwsCredentialSource } from "./services/aws/client-config";
import { ConfigService } from "./services/config.service";

function assertSafeProductionAwsCredentials(appEnv: "stage" | "prod"): void {
  if (appEnv !== "prod") {
    return;
  }

  if (!process.env.AWS_SESSION_TOKEN) {
    return;
  }

  throw new Error(
    "Refusing to start production with AWS_SESSION_TOKEN set. Use an IAM role, a refreshable AWS profile, or long-lived machine credentials instead of temporary session tokens.",
  );
}

async function verifyAwsIdentity(region: string, appEnv: "stage" | "prod", logger: Logger): Promise<void> {
  const credentialSource = describeAwsCredentialSource();
  logger.log(`Verifying AWS identity for ${appEnv} using ${credentialSource}`);

  const client = new STSClient(createAwsClientConfig(region));
  const identity = await client.send(new GetCallerIdentityCommand({}));

  logger.log(
    `AWS identity verified for ${appEnv}: account ${identity.Account ?? "unknown"}, arn ${identity.Arn ?? "unknown"}`,
  );
}

async function bootstrap(): Promise<void> {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  try {
    const configService = app.get(ConfigService);
    const config = configService.getConfig();

    assertSafeProductionAwsCredentials(config.appEnv);
    await verifyAwsIdentity(config.awsRegion, config.appEnv, logger);

    await app.listen(config.port);

    logger.log(`Backend listening on http://localhost:${config.port} (${config.appEnv})`);
  } catch (error) {
    logger.error(
      `Backend startup failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error.stack : undefined,
    );
    await app.close();
    process.exitCode = 1;
  }
}

void bootstrap();
