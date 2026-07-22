import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Neon HTTP driver — preferred on Vercel serverless (no pool exhaustion).
 * Requires DATABASE_URL (pooled Neon connection string).
 */
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon pooled connection string.",
    );
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

// Lazy singleton so build-time imports without env don't crash
let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

/** Convenience alias — prefer getDb() in new code if you need lazy init. */
export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
