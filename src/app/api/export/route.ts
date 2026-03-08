import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  projects,
  labels,
  tasks,
  taskLabels,
  dailyReviews,
  taskCompletions,
} from "@/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [
    userProjects,
    userLabels,
    userTasks,
    userTaskLabels,
    userDailyReviews,
    userTaskCompletions,
  ] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.deletedAt))),
    db
      .select()
      .from(labels)
      .where(and(eq(labels.userId, userId), isNull(labels.deletedAt))),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt))),
    // taskLabels don't have userId — join through tasks
    db
      .select({
        taskId: taskLabels.taskId,
        labelId: taskLabels.labelId,
      })
      .from(taskLabels)
      .innerJoin(tasks, eq(taskLabels.taskId, tasks.id))
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt))),
    db
      .select()
      .from(dailyReviews)
      .where(eq(dailyReviews.userId, userId)),
    db
      .select()
      .from(taskCompletions)
      .where(eq(taskCompletions.userId, userId)),
  ]);

  // Strip userId from records (will be filled on import)
  const stripUserId = <T extends { userId: string }>(
    rows: T[],
  ): Omit<T, "userId">[] =>
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rows.map(({ userId: _uid, ...rest }) => rest);

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      projects: stripUserId(userProjects),
      labels: stripUserId(userLabels),
      tasks: stripUserId(userTasks),
      taskLabels: userTaskLabels,
      dailyReviews: stripUserId(userDailyReviews),
      taskCompletions: stripUserId(userTaskCompletions),
    },
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="taskflow-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
