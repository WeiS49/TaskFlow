import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Simplified form — drizzle auto-creates neon HTTP client from URL
export const db = drizzle(process.env.DATABASE_URL!, { schema });

// Alternative: explicit neon client
// import { neon } from "@neondatabase/serverless";
// const sql = neon(process.env.DATABASE_URL!);
// export const db = drizzle({ client: sql, schema });
