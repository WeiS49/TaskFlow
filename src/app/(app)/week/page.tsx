import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getWeekTasks, getProjects, getLabels } from "@/db/queries";
import { getWeekRange } from "@/lib/date-utils";
import { WeekHeader } from "@/components/week/week-header";
import { WeekDndWrapper } from "@/components/week/week-dnd-wrapper";

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const offset = params.offset ? parseInt(params.offset, 10) : 0;
  const week = getWeekRange(session.user.timezone, offset);

  const [tasks, projects, labels] = await Promise.all([
    getWeekTasks(session.user.id, week),
    getProjects(session.user.id),
    getLabels(session.user.id),
  ]);

  return (
    <div className="px-10 py-8 space-y-6">
      <WeekHeader start={week.start} end={week.end} offset={offset} />
      <WeekDndWrapper
        days={week.days}
        tasks={tasks}
        projects={projects}
        labels={labels}
      />
    </div>
  );
}
