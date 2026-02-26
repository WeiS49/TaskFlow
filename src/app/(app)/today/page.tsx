import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTodayTasks } from "@/db/queries";
import { DayHeader } from "@/components/daily-plan/day-header";
import { TimeBlockSection } from "@/components/daily-plan/time-block-section";
import { TIME_BLOCKS } from "@/lib/constants";

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tasks, grouped } = await getTodayTasks(session.user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <DayHeader tasks={tasks} />

      {TIME_BLOCKS.map((block) => (
        <TimeBlockSection
          key={block}
          timeBlock={block}
          tasks={grouped[block]}
        />
      ))}
    </div>
  );
}
