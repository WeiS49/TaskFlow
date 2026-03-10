"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { format, parseISO, isToday } from "date-fns";
import { WeekTaskCard } from "@/components/week/week-task-card";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/db/queries";
import type { Project, Label, Task } from "@/db/schema";

interface DayColumnProps {
  date: string;
  tasks: TaskWithRelations[];
  projects: Project[];
  labels: Label[];
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onTaskUpdated?: (task: Task) => void;
}

export function DayColumn({ date, tasks, projects, labels, onComplete, onDelete, onTaskUpdated }: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const dateObj = parseISO(date);
  const today = isToday(dateObj);

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border p-3 min-h-[200px]",
        today && "border-primary/40 bg-primary/[0.02]",
        !today && "border-border",
      )}
    >
      <div className="mb-3 text-center">
        <div className={cn(
          "text-xs font-medium",
          today ? "text-primary" : "text-muted-foreground",
        )}>
          {format(dateObj, "EEE")}
        </div>
        <div className={cn(
          "mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
          today && "bg-primary text-primary-foreground",
        )}>
          {format(dateObj, "d")}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 rounded-md transition-colors min-h-[60px]",
          isOver && "bg-primary/5",
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <WeekTaskCard
              key={task.id}
              task={task}
              projects={projects}
              labels={labels}
              onComplete={onComplete}
              onDelete={onDelete}
              onTaskUpdated={onTaskUpdated}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && !isOver && (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground/40">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}
