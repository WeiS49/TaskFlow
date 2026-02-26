import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { projects, labels } from "@/db/schema";
import { SidebarNav } from "./sidebar-nav";

interface SidebarProps {
  user: { id: string; name: string; email: string };
}

export async function Sidebar({ user }: SidebarProps) {
  const [userProjects, userLabels] = await Promise.all([
    db.query.projects.findMany({
      where: and(eq(projects.userId, user.id), isNull(projects.deletedAt)),
      orderBy: (p, { asc }) => [asc(p.position)],
    }),
    db.query.labels.findMany({
      where: eq(labels.userId, user.id),
      orderBy: (l, { asc }) => [asc(l.name)],
    }),
  ]);

  return (
    <SidebarNav
      user={user}
      projects={userProjects}
      labels={userLabels}
    />
  );
}
