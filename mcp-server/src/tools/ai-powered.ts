import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Db } from "../db.js";
import {
  tasks,
  TASK_STATUSES,
  PRIORITIES,
  TIME_BLOCKS,
} from "../schema.js";

export function registerAiPoweredTools(
  server: McpServer,
  db: Db,
  userId: string,
): void {
  // -----------------------------------------------------------------------
  // split_task
  // -----------------------------------------------------------------------
  server.registerTool(
    "split_task",
    {
      title: "Split Task into Subtasks",
      description:
        "Break a parent task into multiple subtasks. Each subtask is created with parentId pointing to the original task. The parent task itself is not modified. Use this to decompose complex tasks into actionable steps.",
      inputSchema: {
        taskId: z.string().uuid().describe("Parent task UUID to split"),
        subtasks: z
          .array(
            z.object({
              title: z
                .string()
                .min(1)
                .max(500)
                .describe("Subtask title"),
              estimatedMinutes: z
                .number()
                .int()
                .min(1)
                .max(480)
                .optional()
                .describe("Estimated duration in minutes"),
            }),
          )
          .min(1)
          .max(20)
          .describe("Array of subtasks to create (1-20)"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ taskId, subtasks }) => {
      // Verify parent exists
      const parent = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.id, taskId),
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
        ),
      });

      if (!parent) {
        return {
          content: [
            { type: "text" as const, text: `Parent task not found: ${taskId}` },
          ],
          isError: true,
        };
      }

      // Create subtasks with sequential positions
      const created = await db
        .insert(tasks)
        .values(
          subtasks.map((sub, i) => ({
            userId,
            parentId: taskId,
            projectId: parent.projectId,
            title: sub.title,
            estimatedMinutes: sub.estimatedMinutes,
            position: (i + 1) * 1.0,
            timeBlock: parent.timeBlock,
            startDate: parent.startDate,
          })),
        )
        .returning();

      const totalMinutes = created.reduce(
        (sum, t) => sum + (t.estimatedMinutes ?? 0),
        0,
      );

      const lines = [`Split **${parent.title}** into ${created.length} subtasks:`, ""];
      for (const sub of created) {
        const est = sub.estimatedMinutes ? ` (${sub.estimatedMinutes}min)` : "";
        lines.push(`- ${sub.title}${est} — ${sub.id.slice(0, 8)}`);
      }
      if (totalMinutes > 0) {
        lines.push("", `Total estimated: ${totalMinutes}min`);
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    },
  );

  // -----------------------------------------------------------------------
  // arrange_today
  // -----------------------------------------------------------------------
  server.registerTool(
    "arrange_today",
    {
      title: "Arrange Today's Schedule",
      description:
        "Batch-assign time blocks to multiple tasks at once. Use this to plan your day by distributing tasks across morning, afternoon, and evening blocks.",
      inputSchema: {
        assignments: z
          .array(
            z.object({
              taskId: z.string().uuid().describe("Task UUID"),
              timeBlock: z
                .enum(TIME_BLOCKS)
                .describe("Target time block"),
            }),
          )
          .min(1)
          .max(50)
          .describe("Array of task-to-timeblock assignments"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ assignments }) => {
      const results: string[] = [];
      let successCount = 0;

      for (const { taskId, timeBlock } of assignments) {
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

        if (task) {
          results.push(`- **${task.title}** -> ${timeBlock}`);
          successCount++;
        } else {
          results.push(`- ~~${taskId.slice(0, 8)}~~ (not found)`);
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Arranged ${successCount}/${assignments.length} tasks:\n\n${results.join("\n")}`,
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // batch_update
  // -----------------------------------------------------------------------
  server.registerTool(
    "batch_update",
    {
      title: "Batch Update Tasks",
      description:
        "Update multiple tasks at once. Each update specifies a taskId and the fields to change. Useful for bulk operations like setting priorities, changing statuses, or rescheduling.",
      inputSchema: {
        updates: z
          .array(
            z.object({
              taskId: z.string().uuid().describe("Task UUID to update"),
              title: z.string().min(1).max(500).optional(),
              status: z.enum(TASK_STATUSES).optional(),
              priority: z.enum(PRIORITIES).optional(),
              timeBlock: z.enum(TIME_BLOCKS).optional(),
              startDate: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/)
                .optional(),
              dueDate: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/)
                .optional(),
              estimatedMinutes: z.number().int().min(1).max(480).optional(),
            }),
          )
          .min(1)
          .max(50)
          .describe("Array of task updates (1-50)"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ updates }) => {
      const results: string[] = [];
      let successCount = 0;

      for (const { taskId, ...fields } of updates) {
        const setValues: Record<string, unknown> = {};
        if (fields.title !== undefined) setValues.title = fields.title;
        if (fields.status !== undefined) {
          setValues.status = fields.status;
          if (fields.status === "done") setValues.completedAt = new Date();
          else setValues.completedAt = null;
        }
        if (fields.priority !== undefined) setValues.priority = fields.priority;
        if (fields.timeBlock !== undefined)
          setValues.timeBlock = fields.timeBlock;
        if (fields.startDate !== undefined)
          setValues.startDate = fields.startDate;
        if (fields.dueDate !== undefined) setValues.dueDate = fields.dueDate;
        if (fields.estimatedMinutes !== undefined)
          setValues.estimatedMinutes = fields.estimatedMinutes;

        if (Object.keys(setValues).length === 0) {
          results.push(`- ~~${taskId.slice(0, 8)}~~ (no fields)`);
          continue;
        }

        const [task] = await db
          .update(tasks)
          .set(setValues)
          .where(
            and(
              eq(tasks.id, taskId),
              eq(tasks.userId, userId),
              isNull(tasks.deletedAt),
            ),
          )
          .returning();

        if (task) {
          const changed = Object.keys(setValues).join(", ");
          results.push(`- **${task.title}**: ${changed}`);
          successCount++;
        } else {
          results.push(`- ~~${taskId.slice(0, 8)}~~ (not found)`);
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Updated ${successCount}/${updates.length} tasks:\n\n${results.join("\n")}`,
          },
        ],
      };
    },
  );
}
