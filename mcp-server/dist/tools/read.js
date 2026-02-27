import { z } from "zod";
import { and, eq, isNull, lte, or, asc, desc } from "drizzle-orm";
import { tasks, TASK_STATUSES, PRIORITIES, } from "../schema.js";
import { formatTaskList, formatGroupedTasks, getToday } from "../utils.js";
export function registerReadTools(server, db, userId) {
    // -----------------------------------------------------------------------
    // list_today_tasks
    // -----------------------------------------------------------------------
    server.registerTool("list_today_tasks", {
        title: "List Today's Tasks",
        description: "List tasks visible today (startDate <= today or no startDate), grouped by time block (morning/afternoon/evening/unscheduled). Shows task title, status, priority, project, and estimates.",
        inputSchema: {},
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    }, async () => {
        const today = getToday();
        const allTasks = await db.query.tasks.findMany({
            where: and(eq(tasks.userId, userId), isNull(tasks.deletedAt), isNull(tasks.parentId), or(lte(tasks.startDate, today), isNull(tasks.startDate))),
            with: {
                project: true,
                subtasks: true,
                taskLabels: { with: { label: true } },
            },
            orderBy: [asc(tasks.position), asc(tasks.createdAt)],
        });
        const grouped = {
            morning: [],
            afternoon: [],
            evening: [],
            unscheduled: [],
        };
        for (const task of allTasks) {
            const block = task.timeBlock || "unscheduled";
            grouped[block].push(task);
        }
        const total = allTasks.length;
        const done = allTasks.filter((t) => t.status === "done").length;
        const totalMinutes = allTasks
            .filter((t) => t.status !== "done")
            .reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0);
        const header = `# Today (${today})\n**${total} tasks** | ${done} done | ${total - done} pending | ~${totalMinutes}min estimated\n`;
        return {
            content: [
                {
                    type: "text",
                    text: header + "\n" + formatGroupedTasks(grouped),
                },
            ],
        };
    });
    // -----------------------------------------------------------------------
    // list_all_tasks
    // -----------------------------------------------------------------------
    server.registerTool("list_all_tasks", {
        title: "List All Tasks",
        description: "List all tasks with optional filters. Returns task title, status, priority, project, dates, and estimates. Only shows top-level tasks (no subtasks).",
        inputSchema: {
            status: z
                .enum(TASK_STATUSES)
                .optional()
                .describe("Filter by status: todo, in_progress, done, cancelled"),
            priority: z
                .enum(PRIORITIES)
                .optional()
                .describe("Filter by priority: none, low, medium, high, urgent"),
            projectId: z
                .string()
                .uuid()
                .optional()
                .describe("Filter by project UUID"),
        },
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    }, async ({ status, priority, projectId }) => {
        const conditions = [
            eq(tasks.userId, userId),
            isNull(tasks.deletedAt),
            isNull(tasks.parentId),
        ];
        if (status) {
            conditions.push(eq(tasks.status, status));
        }
        if (priority) {
            conditions.push(eq(tasks.priority, priority));
        }
        if (projectId) {
            conditions.push(eq(tasks.projectId, projectId));
        }
        const allTasks = await db.query.tasks.findMany({
            where: and(...conditions),
            with: {
                project: true,
                subtasks: true,
                taskLabels: { with: { label: true } },
            },
            orderBy: [desc(tasks.createdAt)],
        });
        const filters = [];
        if (status)
            filters.push(`status=${status}`);
        if (priority)
            filters.push(`priority=${priority}`);
        if (projectId)
            filters.push(`project=${projectId.slice(0, 8)}`);
        const heading = filters.length
            ? `All Tasks (${filters.join(", ")})`
            : "All Tasks";
        return {
            content: [
                {
                    type: "text",
                    text: `${allTasks.length} tasks found.\n\n${formatTaskList(allTasks, heading)}`,
                },
            ],
        };
    });
    // -----------------------------------------------------------------------
    // get_task
    // -----------------------------------------------------------------------
    server.registerTool("get_task", {
        title: "Get Task Details",
        description: "Get full details of a single task by ID, including project, labels, and subtasks.",
        inputSchema: {
            taskId: z.string().uuid().describe("The task UUID"),
        },
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    }, async ({ taskId }) => {
        const task = await db.query.tasks.findFirst({
            where: and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNull(tasks.deletedAt)),
            with: {
                project: true,
                subtasks: true,
                taskLabels: { with: { label: true } },
            },
        });
        if (!task) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Task not found: ${taskId}`,
                    },
                ],
                isError: true,
            };
        }
        const lines = [`# ${task.title}`, ""];
        lines.push(`- **ID**: ${task.id}`);
        lines.push(`- **Status**: ${task.status}`);
        lines.push(`- **Priority**: ${task.priority}`);
        lines.push(`- **Time block**: ${task.timeBlock}`);
        if (task.description)
            lines.push(`- **Description**: ${task.description}`);
        if (task.project)
            lines.push(`- **Project**: ${task.project.name}`);
        if (task.startDate)
            lines.push(`- **Start date**: ${task.startDate}`);
        if (task.dueDate)
            lines.push(`- **Due date**: ${task.dueDate}`);
        if (task.estimatedMinutes)
            lines.push(`- **Estimate**: ${task.estimatedMinutes}min`);
        if (task.completedAt)
            lines.push(`- **Completed**: ${task.completedAt.toISOString().split("T")[0]}`);
        lines.push(`- **Created**: ${task.createdAt.toISOString().split("T")[0]}`);
        if (task.parentId)
            lines.push(`- **Parent**: ${task.parentId}`);
        if (task.taskLabels?.length) {
            lines.push(`- **Labels**: ${task.taskLabels.map((tl) => tl.label.name).join(", ")}`);
        }
        if (task.subtasks?.length) {
            const done = task.subtasks.filter((s) => s.status === "done").length;
            lines.push("");
            lines.push(`## Subtasks (${done}/${task.subtasks.length} done)`);
            for (const sub of task.subtasks) {
                const check = sub.status === "done" ? "[x]" : "[ ]";
                lines.push(`- ${check} ${sub.title} (${sub.id.slice(0, 8)})`);
            }
        }
        return {
            content: [{ type: "text", text: lines.join("\n") }],
        };
    });
}
//# sourceMappingURL=read.js.map