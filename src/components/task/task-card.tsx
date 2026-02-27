"use client";

import { useState, useTransition } from "react";
import { toggleTaskStatus } from "@/actions/task-actions";
import { TaskCheckbox } from "./task-checkbox";
import { TaskEditDialog } from "./task-edit-dialog";
import { ProjectBadge } from "@/components/project/project-badge";
import { LabelBadge } from "@/components/label/label-badge";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/db/queries";
import type { Project, Label } from "@/db/schema";

interface TaskCardProps {
  task: TaskWithRelations;
  projects: Project[];
  labels?: Label[];
}

export function TaskCard({ task, projects }: TaskCardProps) {
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const isDone = task.status === "done";

  function handleToggle() {
    startTransition(async () => {
      await toggleTaskStatus(task.id);
    });
  }

  return (
    <>
      <div
        className={cn(
          "group flex items-start gap-3.5 rounded-xl border border-border bg-card px-5 py-4 transition-all hover:border-primary hover:shadow-[0_2px_8px_rgba(99,102,241,0.08)] cursor-pointer",
          isPending && "opacity-60",
        )}
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
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              isDone && "line-through text-muted-foreground",
            )}
          >
            {task.title}
          </p>

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
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
