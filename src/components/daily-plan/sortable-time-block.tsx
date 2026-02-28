"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableTaskCard } from "./sortable-task-card";
import { TaskForm } from "@/components/task/task-form";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/db/queries";
import type { ScheduledTimeBlock } from "@/lib/constants";
import type { Project, Label } from "@/db/schema";

const TIME_BLOCK_LABELS: Record<ScheduledTimeBlock, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

interface SortableTimeBlockProps {
  timeBlock: ScheduledTimeBlock;
  tasks: TaskWithRelations[];
  projects: Project[];
  labels: Label[];
  onComplete?: (taskId: string) => void;
}

export function SortableTimeBlock({ timeBlock, tasks, projects, labels, onComplete }: SortableTimeBlockProps) {
  const { setNodeRef, isOver } = useDroppable({ id: timeBlock });

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="font-[family-name:var(--font-heading)] text-sm font-medium text-muted-foreground whitespace-nowrap">
          {TIME_BLOCK_LABELS[timeBlock]}
        </span>
        <hr className="flex-1 border-border" />
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "space-y-2.5 rounded-lg transition-colors min-h-[2rem] pl-7",
          isOver && "bg-primary/5",
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} projects={projects} labels={labels} onComplete={onComplete} />
          ))}
        </SortableContext>
      </div>

      <div className="pl-7">
        <TaskForm defaultTimeBlock={timeBlock} projects={projects} />
      </div>
    </section>
  );
}
