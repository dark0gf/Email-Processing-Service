/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_ENV: string;
  readonly BACKEND_URL: string;
  readonly BACKEND_PORT?: string;
  readonly FRONTEND_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}