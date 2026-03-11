"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  users,
  projects,
  labels,
  tasks,
  taskLabels,
  dailyReviews,
  taskCompletions,
} from "@/db/schema";
import { requireAuth, type ActionResult } from "@/lib/auth-utils";

export async function updateTimezone(
  timezone: string,
): Promise<ActionResult<{ timezone: string }>> {
  try {
    const userId = await requireAuth();

    // Validate timezone by attempting to use it
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      return { success: false, error: "Invalid timezone" };
    }

    await db
      .update(users)
      .set({ timezone })
      .where(eq(users.id, userId));

    revalidatePath("/", "layout");
    return { success: true, data: { timezone } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update timezone",
    };
  }
}

const recordArray = z.array(z.record(z.string(), z.unknown()));

const importSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  data: z.object({
    projects: recordArray,
    labels: recordArray,
    tasks: recordArray,
    taskLabels: z.array(
      z.object({ taskId: z.string(), labelId: z.string() }),
    ),
    dailyReviews: recordArray,
    taskCompletions: recordArray,
  }),
});

export async function importData(
  formData: FormData,
): Promise<ActionResult<{ count: number }>> {
  try {
    const userId = await requireAuth();

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const text = await file.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { success: false, error: "Invalid JSON file" };
    }

    const parsed = importSchema.safeParse(json);
    if (!parsed.success) {
      return {
        success: false,
        error: `Invalid export format: ${parsed.error.issues[0].message}`,
      };
    }

    const { data } = parsed.data;

    // Execute in a transaction: delete all → insert all
    await db.transaction(async (tx) => {
      // Delete in reverse dependency order
      await tx.delete(taskCompletions).where(eq(taskCompletions.userId, userId));
      // taskLabels has no userId — delete via tasks subquery
      await tx.delete(taskLabels).where(
        inArray(
          taskLabels.taskId,
          tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.userId, userId)),
        ),
      );
      await tx.delete(dailyReviews).where(eq(dailyReviews.userId, userId));
      await tx.delete(tasks).where(eq(tasks.userId, userId));
      await tx.delete(labels).where(eq(labels.userId, userId));
      await tx.delete(projects).where(eq(projects.userId, userId));

      // Insert with userId injected
      if (data.projects.length > 0) {
        await tx.insert(projects).values(
          data.projects.map((p) => ({ ...p, userId }) as typeof projects.$inferInsert),
        );
      }

      if (data.labels.length > 0) {
        await tx.insert(labels).values(
          data.labels.map((l) => ({ ...l, userId }) as typeof labels.$inferInsert),
        );
      }

      if (data.tasks.length > 0) {
        await tx.insert(tasks).values(
          data.tasks.map((t) => ({ ...t, userId }) as typeof tasks.$inferInsert),
        );
      }

      if (data.taskLabels.length > 0) {
        await tx.insert(taskLabels).values(data.taskLabels);
      }

      if (data.dailyReviews.length > 0) {
        await tx.insert(dailyReviews).values(
          data.dailyReviews.map((r) => ({ ...r, userId }) as typeof dailyReviews.$inferInsert),
        );
      }

      if (data.taskCompletions.length > 0) {
        await tx.insert(taskCompletions).values(
          data.taskCompletions.map((c) => ({ ...c, userId }) as typeof taskCompletions.$inferInsert),
        );
      }
    });

    const totalRecords =
      data.projects.length +
      data.labels.length +
      data.tasks.length +
      data.taskLabels.length +
      data.dailyReviews.length +
      data.taskCompletions.length;

    revalidatePath("/", "layout");

    return { success: true, data: { count: totalRecords } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Import failed",
    };
  }
}
