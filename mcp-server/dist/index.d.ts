#!/usr/bin/env node
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type Db } from "./db.js";
declare const db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof import("./schema.js")> & {
    $client: import("postgres").Sql<{}>;
};
declare const server: McpServer;
declare function getUserId(): Promise<string>;
export { db, server, getUserId };
export type { Db };
