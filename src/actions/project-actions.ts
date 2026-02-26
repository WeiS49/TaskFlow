"use server";

import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { projectCreateSchema, projectUpdateSchema } from "@/lib/validators";
import { requireAuth, type ActionResult } from "@/lib/auth-utils";
import type { Project } from "@/db/schema";

export async function createProject(
  _prev: ActionResult<Project> | null,
  formData: FormData,
): Promise<ActionResult<Project>> {
  try {
    const userId = await requireAuth();
    const parsed = projectCreateSchema.safeParse(Object.fromEntries(formData));

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const [project] = await db
      .insert(projects)
      .values({ ...parsed.data, userId })
      .returning();

    revalidatePath("/today");
    revalidatePath("/tasks");
    return { success: true, data: project };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create project",
    };
  }
}

export async function updateProject(
  id: string,
  formData: FormData,
): Promise<ActionResult<Project>> {
  try {
    const userId = await requireAuth();
    const parsed = projectUpdateSchema.safeParse(Object.fromEntries(formData));

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const [project] = await db
      .update(projects)
      .set(parsed.data)
      .where(
        and(
          eq(projects.id, id),
          eq(projects.userId, userId),
          isNull(projects.deletedAt),
        ),
      )
      .returning();

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    revalidatePath("/today");
    revalidatePath("/tasks");
    return { success: true, data: project };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update project",
    };
  }
}

export async function deleteProject(
  id: string,
): Promise<ActionResult<Project>> {
  try {
    const userId = await requireAuth();

    const [project] = await db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(projects.id, id),
          eq(projects.userId, userId),
          isNull(projects.deletedAt),
        ),
      )
      .returning();

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    revalidatePath("/today");
    revalidatePath("/tasks");
    return { success: true, data: project };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete project",
    };
  }
}
