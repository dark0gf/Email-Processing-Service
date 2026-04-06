import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { z } from "zod";

const viteEnvSchema = z.object({
  APP_ENV: z.enum(["stage", "prod"]),
  BACKEND_URL: z.string().url(),
  FRONTEND_AUTH_USERNAME: z.string().min(1),
  FRONTEND_AUTH_PASSWORD: z.string().min(1),
  FRONTEND_PORT: z.string().regex(/^\d+$/),
  FRONTEND_ALLOWED_HOSTS: z.string().min(1),
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "");
  const parsedEnv = viteEnvSchema.parse(env);
  const frontendPort = Number(parsedEnv.FRONTEND_PORT);
  const allowedHosts = parsedEnv.FRONTEND_ALLOWED_HOSTS.split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  return {
    envDir: "..",
    envPrefix: ["APP_", "BACKEND_", "FRONTEND_"],
    plugins: [react(), tailwindcss()],
    server: {
      host: "0.0.0.0",
      port: frontendPort,
      allowedHosts,
    },
    preview: {
      host: "0.0.0.0",
      port: frontendPort,
    },
  };
});