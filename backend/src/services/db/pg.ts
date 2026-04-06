import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export function createDbClient(databaseUrl: string): {
  db: ReturnType<typeof drizzle<typeof schema>>;
  pool: Pool;
} {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("rds.amazonaws.com") ? { rejectUnauthorized: false } : undefined,
  });

  const db = drizzle(pool, { schema });

  return { db, pool };
}
