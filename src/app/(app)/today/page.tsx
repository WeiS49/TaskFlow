import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserTimezone } from "@/lib/auth-utils";
import { getTodayTasks, getProjects, getLabels, getCompletedToday, getTomorrowTasks, getDailyReview, getTodayRecurringCompletions } from "@/db/queries";
import { getLocalToday } from "@/lib/date-utils";
import { DayHeader } from "@/components/daily-plan/day-header";
import { TodayDndWrapper } from "@/components/daily-plan/today-dnd-wrapper";
import { ReviewPanel } from "@/components/daily-plan/review-panel";

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tz = await getUserTimezone(session.user.id);
  const today = getLocalToday(tz);

  const [{ tasks, grouped, unscheduled }, projects, labels, completedTasks, tomorrowTasks, review, recurringCompletions] = await Promise.all([
    getTodayTasks(session.user.id, tz),
    getProjects(session.user.id),
    getLabels(session.user.id),
    getCompletedToday(session.user.id, tz),
    getTomorrowTasks(session.user.id, tz),
    getDailyReview(session.user.id, today),
    getTodayRecurringCompletions(session.user.id, tz),
  ]);

  return (
    <div className="flex gap-8 px-10 py-8">
      <div className="flex-1 min-w-0 space-y-6">
        <DayHeader tasks={tasks} />
        <TodayDndWrapper grouped={grouped} unscheduled={unscheduled} completedToday={completedTasks} projects={projects} labels={labels} today={today} keyTaskId={review?.keyTaskId ?? null} />
      </div>
      <ReviewPanel
        completedTasks={completedTasks}
        tomorrowTasks={tomorrowTasks}
        review={review ?? null}
        date={today}
        recurringCompletions={recurringCompletions}
        keyTaskId={review?.keyTaskId ?? null}
      />
    </div>
  );
}
