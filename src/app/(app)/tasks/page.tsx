import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAllTasks, getProjects, getLabels } from "@/db/queries";
import { TasksPageClient } from "./tasks-page-client";

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [tasks, projects, labels] = await Promise.all([
    getAllTasks(session.user.id),
    getProjects(session.user.id),
    getLabels(session.user.id),
  ]);

  return <TasksPageClient tasks={tasks} projects={projects} labels={labels} />;
}
