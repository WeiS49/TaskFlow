import { and, eq, ne, isNull, ilike, or, desc, asc, gte, lte, lt, sql, count, sum } from "drizzle-orm";
import { db } from "@/db";
import { tasks, projects, labels, dailyReviews, taskCompletions } from "@/db/schema";
import type { ScheduledTimeBlock } from "@/lib/constants";
import { SCHEDULED_TIME_BLOCKS } from "@/lib/constants";
import { getLocalToday, getLocalTomorrow, getLocalDayRange, type WeekRange } from "@/lib/date-utils";

export async function getTodayTasks(userId: string, timezone: string) {
  const today = getLocalToday(timezone);

  const allTasks = await db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, userId),
      isNull(tasks.deletedAt),
      or(
        eq(tasks.startDate, today),
        and(lte(tasks.startDate, today), gte(tasks.dueDate, today)),
      ),
      ne(tasks.status, "done"),
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
  const unscheduled: typeof allTasks = [];

  for (const task of allTasks) {
    const block = task.timeBlock as ScheduledTimeBlock;
    if (SCHEDULED_TIME_BLOCKS.includes(block)) {
      grouped[block].push(task);
    } else {
      unscheduled.push(task);
    }
  }

  return { tasks: allTasks, grouped, unscheduled };
}

export async function getWeekTasks(userId: string, week: WeekRange) {
  return db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, userId),
      isNull(tasks.deletedAt),
      ne(tasks.status, "done"),
      or(
        and(gte(tasks.startDate, week.start), lte(tasks.startDate, week.end)),
        and(lte(tasks.startDate, week.end), gte(tasks.dueDate, week.start)),
      ),
    ),
    with: {
      project: true,
      taskLabels: { with: { label: true } },
      subtasks: true,
    },
    orderBy: [asc(tasks.position), asc(tasks.createdAt)],
  });
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

export async function getCompletedToday(userId: string, timezone: string) {
  const { start: startOfDay, end: endOfDay } = getLocalDayRange(timezone);

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
      taskLabels: { with: { label: true } },
      subtasks: true,
    },
    orderBy: [desc(tasks.completedAt)],
  });
}

export async function getTomorrowTasks(userId: string, timezone: string) {
  const tomorrowStr = getLocalTomorrow(timezone);

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

export async function getTodayRecurringCompletions(userId: string, timezone: string) {
  const today = getLocalToday(timezone);
  return db.query.taskCompletions.findMany({
    where: and(
      eq(taskCompletions.userId, userId),
      eq(taskCompletions.date, today),
    ),
    with: { task: true },
    orderBy: [desc(taskCompletions.completedAt)],
  });
}

export type RecurringCompletion = Awaited<ReturnType<typeof getTodayRecurringCompletions>>[number];

export async function getDailyReview(userId: string, date: string) {
  return db.query.dailyReviews.findFirst({
    where: and(
      eq(dailyReviews.userId, userId),
      eq(dailyReviews.date, date),
    ),
    with: { keyTask: true },
  });
}

export interface DayStats {
  date: string;
  completedCount: number;
  totalMinutes: number;
  keyTaskCompleted: boolean;
  mood: string | null;
  energyLevel: number | null;
}

export async function getDailyStatistics(
  userId: string,
  timezone: string,
  days: number,
): Promise<DayStats[]> {
  const today = getLocalToday(timezone);
  const startDate = new Date(today + "T00:00:00");
  startDate.setDate(startDate.getDate() - days + 1);
  const startStr = startDate.toISOString().slice(0, 10);

  // Regular completions by date (JS-side timezone grouping to avoid AT TIME ZONE)
  const rangeStart = new Date(startStr + "T00:00:00Z");
  rangeStart.setDate(rangeStart.getDate() - 1); // buffer for timezone offset
  const rangeEnd = new Date(today + "T00:00:00Z");
  rangeEnd.setDate(rangeEnd.getDate() + 2); // buffer for timezone offset

  const completedTasks = await db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, userId),
      eq(tasks.status, "done"),
      isNull(tasks.deletedAt),
      eq(tasks.isRecurring, false),
      gte(tasks.completedAt, rangeStart),
      lt(tasks.completedAt, rangeEnd),
    ),
    columns: { completedAt: true, estimatedMinutes: true },
  });

  // Group by local date in user's timezone
  const regularMap = new Map<string, { completedCount: number; totalMinutes: number }>();
  for (const t of completedTasks) {
    if (!t.completedAt) continue;
    const localDate = t.completedAt.toLocaleDateString("en-CA", { timeZone: timezone });
    if (localDate < startStr) continue;
    const entry = regularMap.get(localDate) ?? { completedCount: 0, totalMinutes: 0 };
    entry.completedCount++;
    entry.totalMinutes += t.estimatedMinutes ?? 0;
    regularMap.set(localDate, entry);
  }
  const regularResults = Array.from(regularMap.entries()).map(([date, stats]) => ({
    date,
    completedCount: stats.completedCount,
    totalMinutes: stats.totalMinutes,
  }));

  // Recurring completions by date
  const recurringResults = await db
    .select({
      date: taskCompletions.date,
      completedCount: count(),
      totalMinutes: sum(taskCompletions.estimatedMinutes),
    })
    .from(taskCompletions)
    .where(
      and(
        eq(taskCompletions.userId, userId),
        gte(taskCompletions.date, startStr),
      ),
    )
    .groupBy(taskCompletions.date);

  // Key task completion + mood/energy by date
  const reviewResults = await db
    .select({
      date: dailyReviews.date,
      keyTaskId: dailyReviews.keyTaskId,
      mood: dailyReviews.mood,
      energyLevel: dailyReviews.energyLevel,
    })
    .from(dailyReviews)
    .where(
      and(
        eq(dailyReviews.userId, userId),
        gte(dailyReviews.date, startStr),
      ),
    );

  // Check which key tasks are completed
  const keyTaskIds = reviewResults
    .map((r) => r.keyTaskId)
    .filter((id): id is string => id !== null);

  const completedKeyTasks = keyTaskIds.length > 0
    ? await db.query.tasks.findMany({
        where: and(
          eq(tasks.status, "done"),
          sql`${tasks.id} = ANY(${sql.raw(`ARRAY[${keyTaskIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})`,
        ),
        columns: { id: true },
      })
    : [];
  const completedKeyTaskSet = new Set(completedKeyTasks.map((t) => t.id));

  // Merge results into a date map
  const dateMap = new Map<string, DayStats>();

  // Initialize all dates
  for (let i = 0; i < days; i++) {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    dateMap.set(dateStr, { date: dateStr, completedCount: 0, totalMinutes: 0, keyTaskCompleted: false, mood: null, energyLevel: null });
  }

  for (const r of regularResults) {
    const stat = dateMap.get(r.date);
    if (stat) {
      stat.completedCount += Number(r.completedCount);
      stat.totalMinutes += Number(r.totalMinutes ?? 0);
    }
  }

  for (const r of recurringResults) {
    const stat = dateMap.get(r.date);
    if (stat) {
      stat.completedCount += Number(r.completedCount);
      stat.totalMinutes += Number(r.totalMinutes ?? 0);
    }
  }

  for (const r of reviewResults) {
    const stat = dateMap.get(r.date);
    if (stat) {
      if (r.keyTaskId) {
        stat.keyTaskCompleted = completedKeyTaskSet.has(r.keyTaskId);
      }
      stat.mood = r.mood;
      stat.energyLevel = r.energyLevel;
    }
  }

  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}
