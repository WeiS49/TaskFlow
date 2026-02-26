"use client";

import { useTransition } from "react";
import { toggleTaskStatus } from "@/actions/task-actions";
import { TaskCheckbox } from "./task-checkbox";
import { ProjectBadge } from "@/components/project/project-badge";
import { LabelBadge } from "@/components/label/label-badge";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/db/queries";

interface TaskCardProps {
  task: TaskWithRelations;
}

export function TaskCard({ task }: TaskCardProps) {
  const [isPending, startTransition] = useTransition();
  const isDone = task.status === "done";

  function handleToggle() {
    startTransition(async () => {
      await toggleTaskStatus(task.id);
    });
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/20",
        isPending && "opacity-60",
      )}
    >
      <TaskCheckbox
        checked={isDone}
        onToggle={handleToggle}
        disabled={isPending}
      />

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium leading-snug",
            isDone && "line-through text-muted-foreground",
          )}
        >
          {task.title}
        </p>

        {task.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {task.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
          {task.estimatedMinutes && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {task.estimatedMinutes}m
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
