import { and, eq, isNull, lte, or, desc, asc } from "drizzle-orm";
import { db } from "@/db";
import { tasks, projects, labels } from "@/db/schema";
import type { TimeBlock } from "@/lib/constants";

export async function getTodayTasks(userId: string) {
  const today = new Date().toISOString().split("T")[0];

  const allTasks = await db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, userId),
      isNull(tasks.deletedAt),
      or(lte(tasks.startDate, today), isNull(tasks.startDate)),
    ),
    with: {
      project: true,
      taskLabels: { with: { label: true } },
    },
    orderBy: [asc(tasks.position), asc(tasks.createdAt)],
  });

  const grouped: Record<TimeBlock, typeof allTasks> = {
    morning: [],
    afternoon: [],
    evening: [],
    unscheduled: [],
  };

  for (const task of allTasks) {
    const block = (task.timeBlock as TimeBlock) || "unscheduled";
    grouped[block].push(task);
  }

  return { tasks: allTasks, grouped };
}

export async function getAllTasks(userId: string) {
  return db.query.tasks.findMany({
    where: and(eq(tasks.userId, userId), isNull(tasks.deletedAt)),
    with: {
      project: true,
      taskLabels: { with: { label: true } },
    },
    orderBy: [desc(tasks.createdAt)],
  });
}

export async function getProjects(userId: string) {
  return db.query.projects.findMany({
    where: and(eq(projects.userId, userId), isNull(projects.deletedAt)),
    orderBy: [asc(projects.position)],
  });
}

export async function getLabels(userId: string) {
  return db.query.labels.findMany({
    where: eq(labels.userId, userId),
    orderBy: [asc(labels.name)],
  });
}

export async function getTaskById(id: string, userId: string) {
  return db.query.tasks.findFirst({
    where: and(
      eq(tasks.id, id),
      eq(tasks.userId, userId),
      isNull(tasks.deletedAt),
    ),
    with: {
      project: true,
      taskLabels: { with: { label: true } },
    },
  });
}

export type TaskWithRelations = NonNullable<
  Awaited<ReturnType<typeof getTaskById>>
>;
