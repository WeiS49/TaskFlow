import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDailyStatistics } from "@/db/queries";
import { StatsOverview } from "@/components/statistics/stats-overview";
import { StatsChart } from "@/components/statistics/stats-chart";

export default async function StatisticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tz = session.user.timezone;

  const [stats7, stats30] = await Promise.all([
    getDailyStatistics(session.user.id, tz, 7),
    getDailyStatistics(session.user.id, tz, 30),
  ]);

  return (
    <div className="px-10 py-8 space-y-8">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
        Statistics
      </h1>

      <StatsOverview stats={stats30} />
      <StatsChart stats7={stats7} stats30={stats30} />
    </div>
  );
}
