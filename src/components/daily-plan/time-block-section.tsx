import { TaskCard } from "@/components/task/task-card";
import { TaskForm } from "@/components/task/task-form";
import type { TaskWithRelations } from "@/db/queries";
import type { TimeBlock } from "@/lib/constants";

const TIME_BLOCK_LABELS: Record<TimeBlock, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  unscheduled: "Unscheduled",
};

interface TimeBlockSectionProps {
  timeBlock: TimeBlock;
  tasks: TaskWithRelations[];
}

export function TimeBlockSection({ timeBlock, tasks }: TimeBlockSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="font-[family-name:var(--font-heading)] text-sm font-medium text-muted-foreground whitespace-nowrap">
          {TIME_BLOCK_LABELS[timeBlock]}
        </span>
        <hr className="flex-1 border-border" />
      </div>

      <div className="space-y-2.5">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      <TaskForm defaultTimeBlock={timeBlock} />
    </section>
  );
}
