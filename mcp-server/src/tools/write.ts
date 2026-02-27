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
import { getToday } from "../utils.js";

export function registerWriteTools(
  server: McpServer,
  db: Db,
  userId: string,
): void {
  // -----------------------------------------------------------------------
  // create_task
  // -----------------------------------------------------------------------
  server.registerTool(
    "create_task",
    {
      title: "Create Task",
      description:
        "Create a new task. Only title is required. Returns the created task's ID and title.",
      inputSchema: {
        title: z
          .string()
          .min(1)
          .max(500)
          .describe("Task title (required)"),
        description: z
          .string()
          .max(5000)
          .optional()
          .describe("Task description"),
        projectId: z
          .string()
          .uuid()
          .optional()
          .describe("Project UUID to assign to"),
        parentId: z
          .string()
          .uuid()
          .optional()
          .describe("Parent task UUID (creates a subtask)"),
        priority: z
          .enum(PRIORITIES)
          .optional()
          .describe("Priority: none, low, medium, high, urgent"),
        timeBlock: z
          .enum(TIME_BLOCKS)
          .optional()
          .describe("Time block: morning, afternoon, evening, unscheduled"),
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Start date (YYYY-MM-DD). Task hidden from Today view until this date"),
        dueDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Due date (YYYY-MM-DD)"),
        estimatedMinutes: z
          .number()
          .int()
          .min(1)
          .max(480)
          .optional()
          .describe("Estimated duration in minutes (1-480)"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (params) => {
      const [task] = await db
        .insert(tasks)
        .values({
          userId,
          title: params.title,
          description: params.description,
          projectId: params.projectId,
          parentId: params.parentId,
          priority: params.priority,
          timeBlock: params.timeBlock,
          startDate: params.startDate,
          dueDate: params.dueDate,
          estimatedMinutes: params.estimatedMinutes,
        })
        .returning();

      return {
        content: [
          {
            type: "text" as const,
            text: `Created task: **${task.title}** (${task.id})`,
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // update_task
  // -----------------------------------------------------------------------
  server.registerTool(
    "update_task",
    {
      title: "Update Task",
      description:
        "Update one or more fields on an existing task. Only pass the fields you want to change.",
      inputSchema: {
        taskId: z.string().uuid().describe("The task UUID to update"),
        title: z.string().min(1).max(500).optional().describe("New title"),
        description: z
          .string()
          .max(5000)
          .optional()
          .describe("New description"),
        status: z
          .enum(TASK_STATUSES)
          .optional()
          .describe("New status: todo, in_progress, done, cancelled"),
        priority: z
          .enum(PRIORITIES)
          .optional()
          .describe("New priority: none, low, medium, high, urgent"),
        timeBlock: z
          .enum(TIME_BLOCKS)
          .optional()
          .describe("New time block: morning, afternoon, evening, unscheduled"),
        projectId: z
          .string()
          .uuid()
          .optional()
          .describe("New project UUID (or null to unassign)"),
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("New start date (YYYY-MM-DD)"),
        dueDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("New due date (YYYY-MM-DD)"),
        estimatedMinutes: z
          .number()
          .int()
          .min(1)
          .max(480)
          .optional()
          .describe("New estimated duration in minutes"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ taskId, ...updates }) => {
      // Build update object with only provided fields
      const setValues: Record<string, unknown> = {};
      if (updates.title !== undefined) setValues.title = updates.title;
      if (updates.description !== undefined)
        setValues.description = updates.description;
      if (updates.status !== undefined) {
        setValues.status = updates.status;
        if (updates.status === "done") {
          setValues.completedAt = new Date();
        } else {
          setValues.completedAt = null;
        }
      }
      if (updates.priority !== undefined) setValues.priority = updates.priority;
      if (updates.timeBlock !== undefined)
        setValues.timeBlock = updates.timeBlock;
      if (updates.projectId !== undefined)
        setValues.projectId = updates.projectId;
      if (updates.startDate !== undefined)
        setValues.startDate = updates.startDate;
      if (updates.dueDate !== undefined) setValues.dueDate = updates.dueDate;
      if (updates.estimatedMinutes !== undefined)
        setValues.estimatedMinutes = updates.estimatedMinutes;

      if (Object.keys(setValues).length === 0) {
        return {
          content: [
            { type: "text" as const, text: "No fields to update." },
          ],
          isError: true,
        };
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

      if (!task) {
        return {
          content: [
            { type: "text" as const, text: `Task not found: ${taskId}` },
          ],
          isError: true,
        };
      }

      const changed = Object.keys(setValues).join(", ");
      return {
        content: [
          {
            type: "text" as const,
            text: `Updated **${task.title}**: ${changed}`,
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // delete_task
  // -----------------------------------------------------------------------
  server.registerTool(
    "delete_task",
    {
      title: "Delete Task",
      description:
        "Soft-delete a task (sets deletedAt timestamp). The task is hidden but not permanently removed.",
      inputSchema: {
        taskId: z.string().uuid().describe("The task UUID to delete"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ taskId }) => {
      const [task] = await db
        .update(tasks)
        .set({ deletedAt: new Date() })
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
            text: `Deleted task: **${task.title}** (${task.id})`,
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // complete_task
  // -----------------------------------------------------------------------
  server.registerTool(
    "complete_task",
    {
      title: "Complete Task",
      description:
        "Toggle a task's completion status. If todo/in_progress -> done. If already done -> todo.",
      inputSchema: {
        taskId: z.string().uuid().describe("The task UUID to complete/uncomplete"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ taskId }) => {
      const existing = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.id, taskId),
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
        ),
      });

      if (!existing) {
        return {
          content: [
            { type: "text" as const, text: `Task not found: ${taskId}` },
          ],
          isError: true,
        };
      }

      const isDone = existing.status === "done";
      const [task] = await db
        .update(tasks)
        .set({
          status: isDone ? "todo" : "done",
          completedAt: isDone ? null : new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      const action = isDone ? "Reopened" : "Completed";
      return {
        content: [
          {
            type: "text" as const,
            text: `${action} task: **${task.title}** (${task.id})`,
          },
        ],
      };
    },
  );
}
