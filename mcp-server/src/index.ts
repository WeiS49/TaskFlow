#!/usr/bin/env node

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createDb, type Db } from "./db.js";
import { registerReadTools } from "./tools/read.js";
import { registerWriteTools } from "./tools/write.js";
import { registerConvenienceTools } from "./tools/convenience.js";
import { registerAiPoweredTools } from "./tools/ai-powered.js";
import { registerChallengeTools } from "./tools/challenge.js";

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

async function getUser(): Promise<{ id: string; timezone: string }> {
  if (process.env.TASKFLOW_USER_ID) {
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, process.env.TASKFLOW_USER_ID!),
    });
    return { id: process.env.TASKFLOW_USER_ID, timezone: user?.timezone ?? "UTC" };
  }
  const user = await db.query.users.findFirst();
  if (!user) {
    throw new Error("No user found in database. Run the seed script first.");
  }
  return { id: user.id, timezone: user.timezone };
}

async function main() {
  const { id: userId, timezone } = await getUser();
  console.error(`TaskFlow MCP Server started (userId: ${userId}, tz: ${timezone})`);

  registerReadTools(server, db, userId, timezone);
  registerWriteTools(server, db, userId);
  registerConvenienceTools(server, db, userId, timezone);
  registerAiPoweredTools(server, db, userId);
  registerChallengeTools(server, db, userId, timezone);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

export { db, server, getUser };
export type { Db };
