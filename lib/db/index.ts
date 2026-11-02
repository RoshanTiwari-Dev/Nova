import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { env } from "@/lib/env";

// Ensure web socket / fetch caching works gracefully in serverless
neonConfig.fetchConnectionCache = true;

const connectionString = env.DATABASE_URL || "postgres://dummy:dummy@localhost:5432/nova";

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
