import postgres from "postgres";
import * as schema from "./schema.js";
export declare function createDb(databaseUrl: string): import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema> & {
    $client: postgres.Sql<{}>;
};
export type Db = ReturnType<typeof createDb>;
