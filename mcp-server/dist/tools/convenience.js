import { z } from "zod";
import { and, eq, isNull, lt, or, ilike, desc } from "drizzle-orm";
import { tasks, PRIORITIES, TIME_BLOCKS } from "../schema.js";
import { formatTaskList, getToday } from "../utils.js";
export function registerConvenienceTools(server, db, userId) {
    // -----------------------------------------------------------------------
    // search_tasks
    // -----------------------------------------------------------------------
    server.registerTool("search_tasks", {
        title: "Search Tasks",
        description: "Search tasks by title or description using fuzzy (case-insensitive) matching. Returns up to 20 matching tasks.",
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
    }, async ({ query }) => {
        const results = await db.query.tasks.findMany({
            where: and(eq(tasks.userId, userId), isNull(tasks.deletedAt), or(ilike(tasks.title, `%${query}%`), ilike(tasks.description, `%${query}%`))),
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
                    type: "text",
                    text: results.length === 0
                        ? `No tasks found matching "${query}".`
                        : `Found ${results.length} task(s) matching "${query}":\n\n${formatTaskList(results)}`,
                },
            ],
        };
    });
    // -----------------------------------------------------------------------
    // get_overdue
    // -----------------------------------------------------------------------
    server.registerTool("get_overdue", {
        title: "Get Overdue Tasks",
        description: "List tasks with a due date before today that are not yet completed. Useful for daily reviews.",
        inputSchema: {},
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    }, async () => {
        const today = getToday();
        const overdue = await db.query.tasks.findMany({
            where: and(eq(tasks.userId, userId), isNull(tasks.deletedAt), lt(tasks.dueDate, today), or(eq(tasks.status, "todo"), eq(tasks.status, "in_progress"))),
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
                    type: "text",
                    text: overdue.length === 0
                        ? "No overdue tasks. You're all caught up!"
                        : `${overdue.length} overdue task(s):\n\n${formatTaskList(overdue, "Overdue")}`,
                },
            ],
        };
    });
    // -----------------------------------------------------------------------
    // set_priority
    // -----------------------------------------------------------------------
    server.registerTool("set_priority", {
        title: "Set Task Priority",
        description: "Quick shortcut to update a task's priority level.",
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
    }, async ({ taskId, priority }) => {
        const [task] = await db
            .update(tasks)
            .set({ priority })
            .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNull(tasks.deletedAt)))
            .returning();
        if (!task) {
            return {
                content: [
                    { type: "text", text: `Task not found: ${taskId}` },
                ],
                isError: true,
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Set **${task.title}** priority to **${priority}**`,
                },
            ],
        };
    });
    // -----------------------------------------------------------------------
    // set_timeblock
    // -----------------------------------------------------------------------
    server.registerTool("set_timeblock", {
        title: "Set Task Time Block",
        description: "Quick shortcut to assign a task to a time block (morning/afternoon/evening/unscheduled).",
        inputSchema: {
            taskId: z.string().uuid().describe("The task UUID"),
            timeBlock: z
                .enum(TIME_BLOCKS)
                .describe("Time block: morning, afternoon, evening, unscheduled"),
        },
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    }, async ({ taskId, timeBlock }) => {
        const [task] = await db
            .update(tasks)
            .set({ timeBlock })
            .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNull(tasks.deletedAt)))
            .returning();
        if (!task) {
            return {
                content: [
                    { type: "text", text: `Task not found: ${taskId}` },
                ],
                isError: true,
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Moved **${task.title}** to **${timeBlock}** block`,
                },
            ],
        };
    });
}
//# sourceMappingURL=convenience.js.map