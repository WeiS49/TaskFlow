#!/usr/bin/env node

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createDb, type Db } from "./db.js";
import { registerReadTools } from "./tools/read.js";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required");
  console.error("Set it in mcp-server/.env or pass via environment");
  process.exit(1);
}

const db = createDb(DATABASE_URL);

const server = new McpServer({
  name: "taskflow-mcp-server",
  version: "1.0.0",
});

async function getUserId(): Promise<string> {
  if (process.env.TASKFLOW_USER_ID) {
    return process.env.TASKFLOW_USER_ID;
  }
  const user = await db.query.users.findFirst();
  if (!user) {
    throw new Error("No user found in database. Run the seed script first.");
  }
  return user.id;
}

async function main() {
  const userId = await getUserId();
  console.error(`TaskFlow MCP Server started (userId: ${userId})`);

  registerReadTools(server, db, userId);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

export { db, server, getUserId };
export type { Db };
