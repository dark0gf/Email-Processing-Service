import path from "node:path";
import { z } from "zod";

export interface AppConfig {
  appEnv: "stage" | "prod";
  port: number;
  authUsername: string;
  authPassword: string;
  jwtSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  awsRegion: string;
  domainName: string;
  rawEmailBucket: string;
  sqsQueueUrl: string;
  receiptEmail: string;
  adminEmail: string;
  sesFromEmail: string;
  databaseUrl: string;
  openRouterApiKey: string;
  openRouterModel: string;
  dataFilePath: string;
  uploadsDir: string;
}

const envSchema = z.object({
  APP_ENV: z.enum(["stage", "prod"]).optional(),
  BACKEND_PORT: z.coerce.number().int().positive(),
  BACKEND_AUTH_USERNAME: z.string().min(1),
  FRONTEND_AUTH_USERNAME: z.string().min(1).optional(),
  BACKEND_AUTH_PASSWORD: z.string().min(1),
  FRONTEND_AUTH_PASSWORD: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(1),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive(),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive(),
  AWS_REGION: z.string().min(1),
  DOMAIN_NAME: z.string().min(1),
  RAW_EMAIL_BUCKET: z.string().min(1),
  SQS_QUEUE_URL: z.string().min(1),
  RECEIPT_EMAIL: z.string().min(1),
  ADMIN_EMAIL: z.string().min(1),
  SES_FROM_EMAIL: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_MODEL: z.string().min(1),
});

export function loadConfig(): AppConfig {
  const env = envSchema.parse(process.env);
  const appEnv = env.APP_ENV === "prod" ? "prod" : "stage";

  return {
    appEnv,
    port: env.BACKEND_PORT,
    authUsername: env.BACKEND_AUTH_USERNAME,
    authPassword: env.BACKEND_AUTH_PASSWORD,
    jwtSecret: env.JWT_SECRET,
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlSeconds: env.REFRESH_TOKEN_TTL_SECONDS,
    awsRegion: env.AWS_REGION,
    domainName: env.DOMAIN_NAME,
    rawEmailBucket: env.RAW_EMAIL_BUCKET,
    sqsQueueUrl: env.SQS_QUEUE_URL,
    receiptEmail: env.RECEIPT_EMAIL,
    adminEmail: env.ADMIN_EMAIL,
    sesFromEmail: env.SES_FROM_EMAIL,
    databaseUrl: env.DATABASE_URL,
    openRouterApiKey: env.OPENROUTER_API_KEY,
    openRouterModel: env.OPENROUTER_MODEL,
    dataFilePath: path.join(process.cwd(), "backend", "data", `${appEnv}.json`),
    uploadsDir: path.join(process.cwd(), "backend", "uploads", appEnv),
  };
}
