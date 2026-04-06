import { migrate } from "drizzle-orm/node-postgres/migrator";

import { loadConfig } from "../../config";
import { createDbClient } from "./pg";

async function run(): Promise<void> {
  const config = loadConfig();

  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required for running migrations");
  }

  const { db, pool } = createDbClient(config.databaseUrl);

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Drizzle migrations completed");
  } finally {
    await pool.end();
  }
}

void run();
