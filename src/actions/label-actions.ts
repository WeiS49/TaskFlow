"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { labels } from "@/db/schema";
import { labelCreateSchema } from "@/lib/validators";
import { requireAuth, type ActionResult } from "@/lib/auth-utils";
import type { Label } from "@/db/schema";

export async function createLabel(
  _prev: ActionResult<Label> | null,
  formData: FormData,
): Promise<ActionResult<Label>> {
  try {
    const userId = await requireAuth();
    const parsed = labelCreateSchema.safeParse(Object.fromEntries(formData));

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const [label] = await db
      .insert(labels)
      .values({ ...parsed.data, userId })
      .returning();

    revalidatePath("/today");
    revalidatePath("/tasks");
    return { success: true, data: label };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create label",
    };
  }
}

export async function updateLabel(
  id: string,
  formData: FormData,
): Promise<ActionResult<Label>> {
  try {
    const userId = await requireAuth();
    const parsed = labelCreateSchema.partial().safeParse(
      Object.fromEntries(formData),
    );

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const [label] = await db
      .update(labels)
      .set(parsed.data)
      .where(and(eq(labels.id, id), eq(labels.userId, userId)))
      .returning();

    if (!label) {
      return { success: false, error: "Label not found" };
    }

    revalidatePath("/today");
    revalidatePath("/tasks");
    return { success: true, data: label };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update label",
    };
  }
}

export async function deleteLabel(id: string): Promise<ActionResult<Label>> {
  try {
    const userId = await requireAuth();

    const [label] = await db
      .delete(labels)
      .where(and(eq(labels.id, id), eq(labels.userId, userId)))
      .returning();

    if (!label) {
      return { success: false, error: "Label not found" };
    }

    revalidatePath("/today");
    revalidatePath("/tasks");
    return { success: true, data: label };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete label",
    };
  }
}
