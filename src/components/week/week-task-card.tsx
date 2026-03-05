"use client";

import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toggleTaskStatus } from "@/actions/task-actions";
import { TaskCheckbox } from "@/components/task/task-checkbox";
import { TaskEditDialog } from "@/components/task/task-edit-dialog";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/db/queries";
import type { Project, Label, Task } from "@/db/schema";

interface WeekTaskCardProps {
  task: TaskWithRelations;
  projects: Project[];
  labels: Label[];
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onTaskUpdated?: (task: Task) => void;
}

export function WeekTaskCard({ task, projects, labels, onComplete, onDelete, onTaskUpdated }: WeekTaskCardProps) {
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const isDone = task.status === "done";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  const PRIORITY_BORDER: Record<string, string> = {
    urgent: "#EF4444",
    high: "#F97316",
  };
  const projectColor = task.project?.color;
  const borderColor = PRIORITY_BORDER[task.priority] ?? projectColor;

  function handleToggle() {
    startTransition(async () => {
      await toggleTaskStatus(task.id);
      if (!isDone) {
        setIsCompleting(true);
        setTimeout(() => {
          onComplete?.(task.id);
        }, 500);
      }
    });
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "transition-all duration-500",
          isCompleting && "opacity-0 scale-95",
        )}
      >
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "flex items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 cursor-grab active:cursor-grabbing transition-colors hover:border-primary/60",
            isPending && "opacity-60",
          )}
          style={{
            borderLeftWidth: borderColor ? "3px" : undefined,
            borderLeftColor: borderColor || undefined,
          }}
          onClick={() => setEditOpen(true)}
        >
          <div className="mt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <TaskCheckbox
              checked={isDone}
              onToggle={handleToggle}
              disabled={isPending}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-xs leading-snug line-clamp-2",
                isDone ? "line-through text-muted-foreground" : "font-medium",
              )}
            >
              {task.title}
              {task.estimatedMinutes && (
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                  {task.estimatedMinutes}m
                </span>
              )}
            </p>
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
