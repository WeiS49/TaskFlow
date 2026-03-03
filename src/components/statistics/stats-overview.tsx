import { CheckCircle2, Clock, Star, Flame } from "lucide-react";
import type { DayStats } from "@/db/queries";

interface StatsOverviewProps {
  stats: DayStats[];
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const totalCompleted = stats.reduce((sum, d) => sum + d.completedCount, 0);
  const totalMinutes = stats.reduce((sum, d) => sum + d.totalMinutes, 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const daysWithKeyTask = stats.filter((d) => d.keyTaskCompleted).length;
  const totalDays = stats.length;

  // Current streak: consecutive days (from today backwards) with key task completed
  let streak = 0;
  for (let i = stats.length - 1; i >= 0; i--) {
    if (stats[i].keyTaskCompleted) {
      streak++;
    } else if (stats[i].completedCount > 0) {
      break; // Active day without key task completion = streak broken
    } else {
      break;
    }
  }

  const cards = [
    {
      icon: CheckCircle2,
      iconColor: "text-emerald-500",
      label: "Tasks completed",
      value: totalCompleted.toString(),
    },
    {
      icon: Clock,
      iconColor: "text-blue-500",
      label: "Time estimated",
      value: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
    },
    {
      icon: Star,
      iconColor: "text-amber-400",
      label: "Key task rate",
      value: `${daysWithKeyTask}/${totalDays}`,
    },
    {
      icon: Flame,
      iconColor: "text-orange-500",
      label: "Key task streak",
      value: `${streak}d`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-border bg-card p-4 space-y-2"
        >
          <div className="flex items-center gap-2">
            <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            <span className="text-xs text-muted-foreground">{card.label}</span>
          </div>
          <p className="text-2xl font-semibold tracking-tight">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
