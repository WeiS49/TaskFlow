import { z } from "zod";
import { and, eq, isNull, lt, or, ilike, desc, gte, count, sum } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Db } from "../db.js";
import { tasks, dailyReviews, taskCompletions, PRIORITIES, TIME_BLOCKS } from "../schema.js";
import { formatTaskList, getToday } from "../utils.js";

export function registerConvenienceTools(
  server: McpServer,
  db: Db,
  userId: string,
  timezone: string,
): void {
  // -----------------------------------------------------------------------
  // search_tasks
  // -----------------------------------------------------------------------
  server.registerTool(
    "search_tasks",
    {
      title: "Search Tasks",
      description:
        "Search tasks by title or description using fuzzy (case-insensitive) matching. Returns up to 20 matching tasks.",
      inputSchema: {
        query: z
          .string()
          .min(2)
          .max(200)
          .describe("Search query to match against task title and description"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ query }) => {
      const results = await db.query.tasks.findMany({
        where: and(
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
          or(
            ilike(tasks.title, `%${query}%`),
            ilike(tasks.description, `%${query}%`),
          ),
        ),
        with: {
          project: true,
          subtasks: true,
          taskLabels: { with: { label: true } },
        },
        orderBy: [desc(tasks.createdAt)],
        limit: 20,
      });

      return {
        content: [
          {
            type: "text" as const,
            text:
              results.length === 0
                ? `No tasks found matching "${query}".`
                : `Found ${results.length} task(s) matching "${query}":\n\n${formatTaskList(results)}`,
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // get_overdue
  // -----------------------------------------------------------------------
  server.registerTool(
    "get_overdue",
    {
      title: "Get Overdue Tasks",
      description:
        "List tasks with a due date before today that are not yet completed. Useful for daily reviews.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const today = getToday(timezone);

      const overdue = await db.query.tasks.findMany({
        where: and(
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
          lt(tasks.dueDate, today),
          or(eq(tasks.status, "todo"), eq(tasks.status, "in_progress")),
        ),
        with: {
          project: true,
          subtasks: true,
          taskLabels: { with: { label: true } },
        },
        orderBy: [desc(tasks.dueDate)],
      });

      return {
        content: [
          {
            type: "text" as const,
            text:
              overdue.length === 0
                ? "No overdue tasks. You're all caught up!"
                : `${overdue.length} overdue task(s):\n\n${formatTaskList(overdue, "Overdue")}`,
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // set_priority
  // -----------------------------------------------------------------------
  server.registerTool(
    "set_priority",
    {
      title: "Set Task Priority",
      description:
        "Quick shortcut to update a task's priority level.",
      inputSchema: {
        taskId: z.string().uuid().describe("The task UUID"),
        priority: z
          .enum(PRIORITIES)
          .describe("New priority: none, low, medium, high, urgent"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ taskId, priority }) => {
      const [task] = await db
        .update(tasks)
        .set({ priority })
        .where(
          and(
            eq(tasks.id, taskId),
            eq(tasks.userId, userId),
            isNull(tasks.deletedAt),
          ),
        )
        .returning();

      if (!task) {
        return {
          content: [
            { type: "text" as const, text: `Task not found: ${taskId}` },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Set **${task.title}** priority to **${priority}**`,
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // set_timeblock
  // -----------------------------------------------------------------------
  server.registerTool(
    "set_timeblock",
    {
      title: "Set Task Time Block",
      description:
        "Quick shortcut to assign a task to a time block (morning/afternoon/evening/unscheduled).",
      inputSchema: {
        taskId: z.string().uuid().describe("The task UUID"),
        timeBlock: z
          .enum(TIME_BLOCKS)
          .describe(
            "Time block: morning, afternoon, evening, unscheduled",
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ taskId, timeBlock }) => {
      const [task] = await db
        .update(tasks)
        .set({ timeBlock })
        .where(
          and(
            eq(tasks.id, taskId),
            eq(tasks.userId, userId),
            isNull(tasks.deletedAt),
          ),
        )
        .returning();

      if (!task) {
        return {
          content: [
            { type: "text" as const, text: `Task not found: ${taskId}` },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Moved **${task.title}** to **${timeBlock}** block`,
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // set_key_task
  // -----------------------------------------------------------------------
  server.registerTool(
    "set_key_task",
    {
      title: "Set Key Task",
      description:
        "Set or clear today's key task. The key task is the single most important task for the day. Setting a new key task replaces the previous one.",
      inputSchema: {
        taskId: z
          .string()
          .uuid()
          .optional()
          .describe("Task UUID to set as key task. Omit to clear the key task."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ taskId }) => {
      const today = getToday(timezone);

      // Upsert daily review with key task
      const existing = await db.query.dailyReviews.findFirst({
        where: and(
          eq(dailyReviews.userId, userId),
          eq(dailyReviews.date, today),
        ),
      });

      if (existing) {
        await db
          .update(dailyReviews)
          .set({ keyTaskId: taskId ?? null })
          .where(eq(dailyReviews.id, existing.id));
      } else {
        await db.insert(dailyReviews).values({
          userId,
          date: today,
          keyTaskId: taskId ?? null,
        });
      }

      if (!taskId) {
        return {
          content: [
            { type: "text" as const, text: "Cleared today's key task." },
          ],
        };
      }

      // Get the task title for confirmation
      const task = await db.query.tasks.findFirst({
        where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Set key task: **${task?.title ?? taskId}**`,
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // get_daily_stats
  // -----------------------------------------------------------------------
  server.registerTool(
    "get_daily_stats",
    {
      title: "Get Daily Stats",
      description:
        "Get today's completion statistics: tasks completed, total estimated time, and key task status.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const today = getToday(timezone);

      // Regular completed tasks today
      const startOfDay = new Date(today + "T00:00:00");
      const endOfDay = new Date(today + "T00:00:00");
      endOfDay.setDate(endOfDay.getDate() + 1);

      const regularDone = await db.query.tasks.findMany({
        where: and(
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
          eq(tasks.status, "done"),
          eq(tasks.isRecurring, false),
          gte(tasks.completedAt, startOfDay),
          lt(tasks.completedAt, endOfDay),
        ),
      });

      // Recurring completions today
      const recurringDone = await db
        .select({
          completedCount: count(),
          totalMinutes: sum(taskCompletions.estimatedMinutes),
        })
        .from(taskCompletions)
        .where(
          and(
            eq(taskCompletions.userId, userId),
            eq(taskCompletions.date, today),
          ),
        );

      const regularCount = regularDone.length;
      const regularMinutes = regularDone.reduce(
        (s, t) => s + (t.estimatedMinutes ?? 0),
        0,
      );
      const recurringCount = Number(recurringDone[0]?.completedCount ?? 0);
      const recurringMinutes = Number(recurringDone[0]?.totalMinutes ?? 0);

      const totalCount = regularCount + recurringCount;
      const totalMinutes = regularMinutes + recurringMinutes;
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      // Key task
      const review = await db.query.dailyReviews.findFirst({
        where: and(
          eq(dailyReviews.userId, userId),
          eq(dailyReviews.date, today),
        ),
        with: { keyTask: true },
      });

      const lines = [
        `# Today's Stats (${today})`,
        "",
        `- **Tasks completed**: ${totalCount} (${regularCount} regular + ${recurringCount} recurring)`,
        `- **Time estimated**: ${timeStr}`,
      ];

      if (review?.keyTask) {
        const keyStatus =
          review.keyTask.status === "done" ? "done" : "pending";
        lines.push(
          `- **Key task**: ${review.keyTask.title} (${keyStatus})`,
        );
      } else {
        lines.push("- **Key task**: not set");
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    },
  );
}
