"use server";

import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tasks, taskLabels, taskCompletions } from "@/db/schema";
import { taskCreateSchema, taskUpdateSchema } from "@/lib/validators";
import { requireAuth, type ActionResult } from "@/lib/auth-utils";
import { auth } from "@/lib/auth";
import { getLocalToday } from "@/lib/date-utils";
import type { Task } from "@/db/schema";
import type { TimeBlock } from "@/lib/constants";

export async function createTask(
  _prev: ActionResult<Task> | null,
  formData: FormData,
): Promise<ActionResult<Task>> {
  try {
    const userId = await requireAuth();

    const raw = Object.fromEntries(formData);
    const estimatedMinutes = raw.estimatedMinutes
      ? Number(raw.estimatedMinutes)
      : undefined;
    const isRecurring = raw.isRecurring === "true" ? true : undefined;
    const recurrenceType = raw.recurrenceType as string | undefined;

    const parsed = taskCreateSchema.safeParse({
      ...raw,
      estimatedMinutes,
      isRecurring,
      recurrenceType: isRecurring ? recurrenceType : undefined,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const [task] = await db
      .insert(tasks)
      .values({ ...parsed.data, userId })
      .returning();

    revalidatePath("/today");
    revalidatePath("/tasks");
    revalidatePath("/week");
    if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
    return { success: true, data: task };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create task",
    };
  }
}

export async function updateTask(
  id: string,
  formData: FormData,
): Promise<ActionResult<Task>> {
  try {
    const userId = await requireAuth();

    const raw = Object.fromEntries(formData);
    const estimatedMinutes = raw.estimatedMinutes
      ? Number(raw.estimatedMinutes)
      : undefined;
    const isRecurring = raw.isRecurring === "true" ? true : raw.isRecurring === "false" ? false : undefined;
    const recurrenceType = raw.recurrenceType as string | undefined;

    const parsed = taskUpdateSchema.safeParse({
      ...raw,
      estimatedMinutes,
      isRecurring,
      recurrenceType: isRecurring ? recurrenceType : undefined,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const [task] = await db
      .update(tasks)
      .set(parsed.data)
      .where(
        and(eq(tasks.id, id), eq(tasks.userId, userId), isNull(tasks.deletedAt)),
      )
      .returning();

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    revalidatePath("/today");
    revalidatePath("/tasks");
    revalidatePath("/week");
    return { success: true, data: task };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update task",
    };
  }
}

export async function deleteTask(id: string): Promise<ActionResult<Task>> {
  try {
    const userId = await requireAuth();

    const [task] = await db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(tasks.id, id), eq(tasks.userId, userId), isNull(tasks.deletedAt)),
      )
      .returning();

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    revalidatePath("/today");
    revalidatePath("/tasks");
    revalidatePath("/week");
    if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
    return { success: true, data: task };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete task",
    };
  }
}

export async function toggleTaskStatus(
  id: string,
): Promise<ActionResult<Task>> {
  try {
    const userId = await requireAuth();

    const existing = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, id),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
      ),
    });

    if (!existing) {
      return { success: false, error: "Task not found" };
    }

    // Recurring task: record completion + keep status as todo
    if (existing.isRecurring && existing.status !== "done") {
      const session = await auth();
      const tz = session?.user?.timezone ?? "UTC";
      const today = getLocalToday(tz);

      await db.insert(taskCompletions).values({
        taskId: id,
        userId,
        date: today,
        estimatedMinutes: existing.estimatedMinutes,
      });

      revalidatePath("/today");
      revalidatePath("/tasks");
      revalidatePath("/week");
      return { success: true, data: existing };
    }

    const isDone = existing.status === "done";
    const [task] = await db
      .update(tasks)
      .set({
        status: isDone ? "todo" : "done",
        completedAt: isDone ? null : new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    revalidatePath("/today");
    revalidatePath("/tasks");
    revalidatePath("/week");
    return { success: true, data: task };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to toggle task status",
    };
  }
}

export async function reorderTask(
  taskId: string,
  position: number,
  timeBlock: TimeBlock,
): Promise<ActionResult<Task>> {
  try {
    const userId = await requireAuth();

    const [task] = await db
      .update(tasks)
      .set({ position, timeBlock })
      .where(
        and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNull(tasks.deletedAt)),
      )
      .returning();

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    revalidatePath("/today");
    revalidatePath("/tasks");
    revalidatePath("/week");
    return { success: true, data: task };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reorder task",
    };
  }
}

export async function reorderProjectTask(
  taskId: string,
  position: number,
): Promise<ActionResult<Task>> {
  try {
    const userId = await requireAuth();

    const [task] = await db
      .update(tasks)
      .set({ position })
      .where(
        and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNull(tasks.deletedAt)),
      )
      .returning();

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
    revalidatePath("/tasks");
    return { success: true, data: task };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reorder task",
    };
  }
}

export async function setTaskLabels(
  taskId: string,
  labelIds: string[],
): Promise<ActionResult<{ taskId: string; labelIds: string[] }>> {
  try {
    const userId = await requireAuth();

    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
      ),
    });

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    await db.delete(taskLabels).where(eq(taskLabels.taskId, taskId));

    if (labelIds.length > 0) {
      await db
        .insert(taskLabels)
        .values(labelIds.map((labelId) => ({ taskId, labelId })));
    }

    revalidatePath("/today");
    revalidatePath("/tasks");
    revalidatePath("/week");
    return { success: true, data: { taskId, labelIds } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update labels",
    };
  }
}

export async function moveTaskToDate(
  taskId: string,
  startDate: string,
  position: number,
): Promise<ActionResult<Task>> {
  try {
    const userId = await requireAuth();

    const [task] = await db
      .update(tasks)
      .set({ startDate, position })
      .where(
        and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNull(tasks.deletedAt)),
      )
      .returning();

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    revalidatePath("/today");
    revalidatePath("/tasks");
    revalidatePath("/week");
    return { success: true, data: task };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to move task",
    };
  }
}
