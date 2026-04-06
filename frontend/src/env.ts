import { z } from "zod";

const frontendEnvSchema = z.object({
  APP_ENV: z.enum(["stage", "prod"]),
  BACKEND_URL: z.string().url(),
});

const parsedFrontendEnv = frontendEnvSchema.safeParse(import.meta.env);

if (!parsedFrontendEnv.success) {
  const message = parsedFrontendEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid frontend environment configuration: ${message}`);
}

export const frontendEnv = {
  appEnv: parsedFrontendEnv.data.APP_ENV,
  backendUrl: parsedFrontendEnv.data.BACKEND_URL.replace(/\/$/, ""),
} as const;