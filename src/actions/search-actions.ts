"use server";

import { requireAuth } from "@/lib/auth-utils";
import { searchTasks, searchProjects } from "@/db/queries";

export async function searchAll(query: string) {
  const userId = await requireAuth();

  const trimmed = query?.trim() ?? "";

  if (trimmed.length < 2) {
    return {
      tasks: [] as Awaited<ReturnType<typeof searchTasks>>,
      projects: [] as Awaited<ReturnType<typeof searchProjects>>,
    };
  }

  const [tasks, projects] = await Promise.all([
    searchTasks(userId, trimmed),
    searchProjects(userId, trimmed),
  ]);

  return { tasks, projects };
}
