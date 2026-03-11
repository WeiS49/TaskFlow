import type { TaskWithRelations } from "@/db/queries";

interface DayHeaderProps {
  tasks: TaskWithRelations[];
}

export function DayHeader({ tasks }: DayHeaderProps) {
  const pendingTasks = tasks.filter((t) => t.status !== "done").length;
  const totalMinutes = tasks.reduce(
    (sum, t) => sum + (t.estimatedMinutes ?? 0),
    0,
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const durationLabel =
    hours > 0
      ? minutes > 0
        ? `${hours}h${minutes}m`
        : `${hours}h`
      : `${minutes}m`;
  const highPriority = tasks.filter(
    (t) => t.status !== "done" && (t.priority === "high" || t.priority === "urgent"),
  ).length;

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-[28px] font-semibold">
        Today&apos;s Plan
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        You have {pendingTasks} tasks today
        {totalMinutes > 0 && `, estimated ${durationLabel}`}.
        {totalMinutes > 480 && (
          <span className="ml-1 text-orange-500 dark:text-orange-400">
            ⚠ Heavy day — consider rescheduling.
          </span>
        )}
      </p>
      <div className="mt-4 flex gap-6">
        <div>
          <div className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-primary">
            {pendingTasks}
          </div>
          <div className="text-[11px] text-muted-foreground">Pending</div>
        </div>
        <div>
          <div className={`font-[family-name:var(--font-heading)] text-2xl font-semibold ${totalMinutes > 600 ? "text-red-500 dark:text-red-400" : totalMinutes > 480 ? "text-orange-500 dark:text-orange-400" : "text-primary"}`}>
            {totalMinutes > 0 ? durationLabel : "—"}
          </div>
          <div className="text-[11px] text-muted-foreground">Estimated</div>
        </div>
        <div>
          <div className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-primary">
            {highPriority}
          </div>
          <div className="text-[11px] text-muted-foreground">High Priority</div>
        </div>
      </div>
    </div>
  );
}
