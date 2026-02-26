import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: NeonHttpDatabase<typeof schema> | null = null;

export function getDb() {
  if (!_db) {
    _db = drizzle(process.env.DATABASE_URL!, { schema });
  }
  return _db;
}

// Proxy that lazily initializes on first property access
// This avoids crashing at build time when DATABASE_URL is not set
export const db: NeonHttpDatabase<typeof schema> = new Proxy(
  {} as NeonHttpDatabase<typeof schema>,
  {
    get(_target, prop, receiver) {
      return Reflect.get(getDb(), prop, receiver);
    },
  },
);

// Alternative: explicit neon client
// import { neon } from "@neondatabase/serverless";
// const sql = neon(process.env.DATABASE_URL!);
// export const db = drizzle({ client: sql, schema });
