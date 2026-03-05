"use client";

import { useMemo, useState, useTransition } from "react";
import { differenceInDays, format, startOfDay } from "date-fns";
import { toggleTaskStatus } from "@/actions/task-actions";
import { TaskCheckbox } from "./task-checkbox";
import { TaskEditDialog } from "./task-edit-dialog";
import { ProjectBadge } from "@/components/project/project-badge";
import { LabelBadge } from "@/components/label/label-badge";
import { Star, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/db/queries";
import type { Project, Label, Task } from "@/db/schema";

const PRIORITY_BORDER: Record<string, string> = {
  urgent: "#EF4444",
  high: "#F97316",
};

interface TaskCardProps {
  task: TaskWithRelations;
  projects: Project[];
  labels: Label[];
  onComplete?: (taskId: string) => void;
  onUncomplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onTaskUpdated?: (task: Task) => void;
  isKeyTask?: boolean;
  onSetKeyTask?: () => void;
}

export function TaskCard({ task, projects, labels, onComplete, onUncomplete, onDelete, onTaskUpdated, isKeyTask, onSetKeyTask }: TaskCardProps) {
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const isDone = task.status === "done";
  const borderColor = PRIORITY_BORDER[task.priority] ?? task.project?.color;

  const dueDateDisplay = useMemo(() => {
    if (!task.dueDate) return null;
    const today = startOfDay(new Date());
    const due = startOfDay(new Date(task.dueDate));
    const diff = differenceInDays(due, today);
    if (diff < 0) return { label: `Overdue · ${format(due, "MMM d")}`, className: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950" };
    if (diff === 0) return { label: "Due today", className: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-950" };
    if (diff === 1) return { label: "Due tomorrow", className: "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-950" };
    if (diff <= 3) return { label: `Due ${format(due, "MMM d")}`, className: "text-muted-foreground bg-secondary" };
    return null;
  }, [task.dueDate]);

  function handleToggle() {
    startTransition(async () => {
      await toggleTaskStatus(task.id);
      if (isDone) {
        onUncomplete?.(task.id);
      } else {
        onComplete?.(task.id);
      }
    });
  }

  return (
    <>
      <div
        className={cn(
          "group flex items-start gap-3.5 rounded-xl border border-border bg-card px-5 py-4 transition-all hover:border-primary hover:shadow-[0_2px_8px_rgba(99,102,241,0.08)] cursor-pointer",
          isPending && "opacity-60",
        )}
        style={{
          borderLeftWidth: borderColor ? "3px" : undefined,
          borderLeftColor: borderColor || undefined,
        }}
        onClick={() => setEditOpen(true)}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <TaskCheckbox
            checked={isDone}
            onToggle={handleToggle}
            disabled={isPending}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p
              className={cn(
                "text-sm font-medium leading-snug",
                isDone && "line-through text-muted-foreground",
              )}
            >
              {task.title}
            </p>
            {onSetKeyTask && (
              <button
                onClick={(e) => { e.stopPropagation(); onSetKeyTask(); }}
                className="shrink-0 p-0.5 rounded hover:bg-secondary transition-colors"
                title={isKeyTask ? "Remove key task" : "Set as key task"}
              >
                <Star className={cn("h-3.5 w-3.5", isKeyTask ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40 hover:text-muted-foreground")} />
              </button>
            )}
            {task.isRecurring && (
              <Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            )}
          </div>

          {task.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
              {task.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {task.project && (
              <ProjectBadge
                name={task.project.name}
                color={task.project.color}
              />
            )}
            {task.taskLabels.map((tl) => (
              <LabelBadge
                key={tl.label.id}
                name={tl.label.name}
                color={tl.label.color}
              />
            ))}
            {task.subtasks && task.subtasks.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                ▸ {task.subtasks.filter((s) => s.status === "done").length}/
                {task.subtasks.length} subtasks
              </span>
            )}
            {dueDateDisplay && (
              <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px]", dueDateDisplay.className)}>
                {dueDateDisplay.label}
              </span>
            )}
            {task.estimatedMinutes && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                ⏱ {task.estimatedMinutes}m
              </span>
            )}
          </div>
        </div>
      </div>

      <TaskEditDialog
        task={task}
        projects={projects}
        labels={labels}
        open={editOpen}
        onOpenChange={setEditOpen}
        onDelete={onDelete}
        onTaskUpdated={onTaskUpdated}
      />
    </>
  );
}
