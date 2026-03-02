import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTodayTasks, getProjects, getLabels, getCompletedToday, getTomorrowTasks, getDailyReview } from "@/db/queries";
import { DayHeader } from "@/components/daily-plan/day-header";
import { TodayDndWrapper } from "@/components/daily-plan/today-dnd-wrapper";
import { ReviewPanel } from "@/components/daily-plan/review-panel";

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  const [{ tasks, grouped, unscheduled }, projects, labels, completedTasks, tomorrowTasks, review] = await Promise.all([
    getTodayTasks(session.user.id),
    getProjects(session.user.id),
    getLabels(session.user.id),
    getCompletedToday(session.user.id),
    getTomorrowTasks(session.user.id),
    getDailyReview(session.user.id, today),
  ]);

  return (
    <div className="flex gap-8 px-10 py-8">
      <div className="flex-1 min-w-0 space-y-6">
        <DayHeader tasks={tasks} />
        <TodayDndWrapper grouped={grouped} unscheduled={unscheduled} projects={projects} labels={labels} />
      </div>
      <ReviewPanel
        completedTasks={completedTasks}
        tomorrowTasks={tomorrowTasks}
        review={review ?? null}
        date={today}
      />
    </div>
  );
}
