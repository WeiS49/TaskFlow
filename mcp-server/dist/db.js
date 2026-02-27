import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
export function createDb(databaseUrl) {
    const client = postgres(databaseUrl);
    return drizzle({ client, schema });
}
//# sourceMappingURL=db.js.map