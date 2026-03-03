import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Db } from "../db.js";
import { projects, tasks, PRIORITIES, TIME_BLOCKS } from "../schema.js";

// TIME_BLOCKS without "unscheduled" for challenge default, full enum for validation
const CHALLENGE_TIME_BLOCKS = TIME_BLOCKS.filter(
  (b) => b !== "unscheduled",
) as unknown as readonly [string, ...string[]];

export function registerChallengeTools(
  server: McpServer,
  db: Db,
  userId: string,
  timezone: string,
): void {
  server.registerTool(
    "import_challenge",
    {
      title: "Import Challenge",
      description:
        "Import a multi-day challenge (7/14/30/60 days) as a Project with scheduled tasks. " +
        "Creates a project and batch-inserts tasks with startDate = today + (day - 1). " +
        "Tasks appear progressively in the /today view as each day arrives.",
      inputSchema: {
        challenge: z
          .string()
          .min(1)
          .max(100)
          .describe("Challenge name — becomes the Project name"),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional()
          .describe('Project color (hex, e.g. "#6366F1"). Default: "#6366F1"'),
        tasks: z
          .array(
            z.object({
              day: z
                .number()
                .int()
                .min(1)
                .max(60)
                .describe("Day number (1-60)"),
              title: z
                .string()
                .min(1)
                .max(500)
                .describe('Task title, e.g. "Day 1: Greetings — Bonjour"'),
              description: z
                .string()
                .max(5000)
                .optional()
                .describe("Task description / reflection prompts"),
              estimatedMinutes: z
                .number()
                .int()
                .min(1)
                .max(480)
                .optional()
                .describe("Estimated duration in minutes"),
              timeBlock: z
                .enum(TIME_BLOCKS)
                .optional()
                .describe(
                  "Time block (morning/afternoon/evening/unscheduled). Default: morning",
                ),
              priority: z
                .enum(PRIORITIES)
                .optional()
                .describe("Priority (none/low/medium/high/urgent). Default: none"),
            }),
          )
          .min(1)
          .max(60)
          .describe("Array of challenge tasks (1-60)"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (params) => {
      const color = params.color ?? "#6366F1";

      // 1. Create project
      const [project] = await db
        .insert(projects)
        .values({
          userId,
          name: params.challenge,
          color,
        })
        .returning();

      // 2. Compute startDates and build task rows (timezone-aware)
      const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
      const todayDate = new Date(todayStr + "T00:00:00");

      const taskRows = params.tasks.map((t, index) => {
        const startDate = new Date(todayDate);
        startDate.setDate(startDate.getDate() + (t.day - 1));
        const dateStr = startDate.toLocaleDateString("en-CA");

        return {
          userId,
          projectId: project.id,
          title: t.title,
          description: t.description,
          startDate: dateStr,
          timeBlock: t.timeBlock ?? ("morning" as const),
          priority: t.priority ?? ("none" as const),
          estimatedMinutes: t.estimatedMinutes,
          position: index,
        };
      });

      // 3. Batch insert tasks
      await db.insert(tasks).values(taskRows);

      // 4. Compute date range for summary
      const days = params.tasks.map((t) => t.day);
      const minDay = Math.min(...days);
      const maxDay = Math.max(...days);
      const firstDate = new Date(todayDate);
      firstDate.setDate(firstDate.getDate() + (minDay - 1));
      const lastDate = new Date(todayDate);
      lastDate.setDate(lastDate.getDate() + (maxDay - 1));

      const fmt = (d: Date) => d.toLocaleDateString("en-CA");

      return {
        content: [
          {
            type: "text" as const,
            text:
              `Imported challenge **${params.challenge}** as project "${project.name}" (${project.id}).\n` +
              `Created ${params.tasks.length} tasks spanning ${fmt(firstDate)} to ${fmt(lastDate)}.`,
          },
        ],
      };
    },
  );
}
