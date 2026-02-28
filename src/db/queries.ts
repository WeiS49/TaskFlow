import { and, eq, isNull, ilike, lte, or, desc, asc, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { tasks, projects, labels, dailyReviews } from "@/db/schema";
import type { ScheduledTimeBlock } from "@/lib/constants";
import { SCHEDULED_TIME_BLOCKS } from "@/lib/constants";

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
      subtasks: true,
    },
    orderBy: [asc(tasks.position), asc(tasks.createdAt)],
  });

  const grouped: Record<ScheduledTimeBlock, typeof allTasks> = {
    morning: [],
    afternoon: [],
    evening: [],
  };

  for (const task of allTasks) {
    const block = task.timeBlock as ScheduledTimeBlock;
    if (SCHEDULED_TIME_BLOCKS.includes(block)) {
      grouped[block].push(task);
    }
  }

  return { tasks: allTasks, grouped };
}

export async function getAllTasks(userId: string) {
  return db.query.tasks.findMany({
    where: and(eq(tasks.userId, userId), isNull(tasks.deletedAt)),
    with: {
      project: true,
      taskLabels: { with: { label: true } },
      subtasks: true,
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
      subtasks: true,
    },
  });
}

export type TaskWithRelations = NonNullable<
  Awaited<ReturnType<typeof getTaskById>>
>;

export async function getFilteredTasks(
  userId: string,
  filters?: { status?: string; priority?: string; projectId?: string },
) {
  const conditions = [eq(tasks.userId, userId), isNull(tasks.deletedAt)];

  if (filters?.status) {
    conditions.push(eq(tasks.status, filters.status as typeof tasks.status.enumValues[number]));
  }
  if (filters?.priority) {
    conditions.push(eq(tasks.priority, filters.priority as typeof tasks.priority.enumValues[number]));
  }
  if (filters?.projectId) {
    conditions.push(eq(tasks.projectId, filters.projectId));
  }

  return db.query.tasks.findMany({
    where: and(...conditions),
    with: {
      project: true,
      taskLabels: { with: { label: true } },
      subtasks: true,
    },
    orderBy: [desc(tasks.createdAt)],
  });
}

export async function getProjectWithTasks(projectId: string, userId: string) {
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.userId, userId),
      isNull(projects.deletedAt),
    ),
  });

  if (!project) return null;

  const projectTasks = await db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, userId),
      eq(tasks.projectId, projectId),
      isNull(tasks.deletedAt),
    ),
    with: {
      project: true,
      taskLabels: { with: { label: true } },
      subtasks: true,
    },
    orderBy: [asc(tasks.position), asc(tasks.createdAt)],
  });

  return { project, tasks: projectTasks };
}

export async function searchTasks(userId: string, query: string) {
  return db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, userId),
      isNull(tasks.deletedAt),
      or(
        ilike(tasks.title, `%${query}%`),
        ilike(tasks.description, `%${query}%`),
      ),
    ),
    with: {
      project: true,
      taskLabels: { with: { label: true } },
    },
    orderBy: [desc(tasks.createdAt)],
    limit: 10,
  });
}

export async function searchProjects(userId: string, query: string) {
  return db.query.projects.findMany({
    where: and(
      eq(projects.userId, userId),
      isNull(projects.deletedAt),
      ilike(projects.name, `%${query}%`),
    ),
    orderBy: [asc(projects.position)],
    limit: 10,
  });
}

export async function getCompletedToday(userId: string) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  return db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, userId),
      isNull(tasks.deletedAt),
      eq(tasks.status, "done"),
      gte(tasks.completedAt, startOfDay),
      lt(tasks.completedAt, endOfDay),
    ),
    with: {
      project: true,
    },
    orderBy: [desc(tasks.completedAt)],
  });
}

export async function getTomorrowTasks(userId: string) {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  return db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, userId),
      isNull(tasks.deletedAt),
      eq(tasks.startDate, tomorrowStr),
    ),
    with: {
      project: true,
    },
    orderBy: [asc(tasks.position)],
  });
}

export async function getDailyReview(userId: string, date: string) {
  return db.query.dailyReviews.findFirst({
    where: and(
      eq(dailyReviews.userId, userId),
      eq(dailyReviews.date, date),
    ),
  });
}
