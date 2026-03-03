import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { projects, labels, tasks } from "@/db/schema";
import { getLocalToday } from "@/lib/date-utils";
import { SidebarNav } from "./sidebar-nav";

interface SidebarProps {
  user: { id: string; name: string; email: string; timezone: string };
}

export async function Sidebar({ user }: SidebarProps) {
  const today = getLocalToday(user.timezone);

  const [userProjects, userLabels, todayTasks] = await Promise.all([
    db.query.projects.findMany({
      where: and(eq(projects.userId, user.id), isNull(projects.deletedAt)),
      orderBy: (p, { asc }) => [asc(p.position)],
    }),
    db.query.labels.findMany({
      where: eq(labels.userId, user.id),
      orderBy: (l, { asc }) => [asc(l.name)],
    }),
    db.query.tasks.findMany({
      where: and(
        eq(tasks.userId, user.id),
        isNull(tasks.deletedAt),
        ne(tasks.status, "done"),
        eq(tasks.startDate, today),
      ),
      columns: { id: true },
    }),
  ]);

  return (
    <SidebarNav
      user={user}
      projects={userProjects}
      labels={userLabels}
      todayTaskCount={todayTasks.length}
      todayDate={today}
    />
  );
}
