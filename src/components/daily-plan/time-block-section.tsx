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
        <h2 className="font-[family-name:var(--font-heading)] text-lg font-medium text-foreground/80">
          {TIME_BLOCK_LABELS[timeBlock]}
        </h2>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      <TaskForm defaultTimeBlock={timeBlock} />
    </section>
  );
}
