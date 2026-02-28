import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProjectWithTasks, getProjects, getLabels } from "@/db/queries";
import { TaskForm } from "@/components/task/task-form";
import { ProjectDndWrapper } from "@/components/project/project-dnd-wrapper";
import { ProjectActions } from "./project-actions";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const [result, projects, labels] = await Promise.all([
    getProjectWithTasks(id, session.user.id),
    getProjects(session.user.id),
    getLabels(session.user.id),
  ]);

  if (!result) notFound();

  const { project, tasks } = result;

  return (
    <div className="px-10 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
            {project.name}
          </h1>
        </div>
        <ProjectActions project={project} />
      </div>

      <div className="pl-7">
        <ProjectDndWrapper tasks={tasks} projects={projects} labels={labels} />
      </div>

      {tasks.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No tasks in this project yet.
        </p>
      )}

      <div className="mt-4">
        <TaskForm defaultProjectId={project.id} projects={projects} />
      </div>
    </div>
  );
}
