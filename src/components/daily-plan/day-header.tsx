import { format } from "date-fns";
import { Calendar } from "lucide-react";
import type { TaskWithRelations } from "@/db/queries";

interface DayHeaderProps {
  tasks: TaskWithRelations[];
}

export function DayHeader({ tasks }: DayHeaderProps) {
  const today = new Date();
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const totalMinutes = tasks.reduce(
    (sum, t) => sum + (t.estimatedMinutes ?? 0),
    0,
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
          {format(today, "EEEE, MMMM d")}
        </h1>
      </div>
      <p className="text-sm text-muted-foreground">
        {completedTasks}/{totalTasks} tasks
        {totalMinutes > 0 && (
          <span>
            {" · "}
            {hours > 0 && `${hours}h `}
            {minutes > 0 && `${minutes}m`}
            {" estimated"}
          </span>
        )}
      </p>
    </div>
  );
}
