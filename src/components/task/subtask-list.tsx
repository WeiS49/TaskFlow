"use client";

import { useState, useTransition, useActionState } from "react";
import { createTask, toggleTaskStatus } from "@/actions/task-actions";
import { TaskCheckbox } from "./task-checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Task, Project, Label } from "@/db/schema";

interface SubtaskListProps {
  subtasks: Task[];
  parentId: string;
  projects: Project[];
  labels: Label[];
}

export function SubtaskList({ subtasks, parentId }: SubtaskListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [togglePendingIds, setTogglePendingIds] = useState<Set<string>>(
    new Set(),
  );
  const [, startToggleTransition] = useTransition();
  const doneCount = subtasks.filter((s) => s.status === "done").length;

  const [, addAction, isAddPending] = useActionState(createTask, null);

  function handleToggle(subtaskId: string) {
    setTogglePendingIds((prev) => new Set(prev).add(subtaskId));
    startToggleTransition(async () => {
      await toggleTaskStatus(subtaskId);
      setTogglePendingIds((prev) => {
        const next = new Set(prev);
        next.delete(subtaskId);
        return next;
      });
    });
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span
          className={cn(
            "inline-block transition-transform",
            isExpanded && "rotate-90",
          )}
        >
          ▸
        </span>
        <span>
          {subtasks.length} subtask{subtasks.length !== 1 ? "s" : ""} (
          {doneCount} done)
        </span>
      </button>

      {isExpanded && (
        <div className="ml-2 space-y-1 border-l border-border pl-3">
          {subtasks.map((subtask) => {
            const isDone = subtask.status === "done";
            const isPending = togglePendingIds.has(subtask.id);
            return (
              <div
                key={subtask.id}
                className={cn(
                  "flex items-center gap-2 py-0.5",
                  isPending && "opacity-60",
                )}
              >
                <TaskCheckbox
                  checked={isDone}
                  onToggle={() => handleToggle(subtask.id)}
                  disabled={isPending}
                />
                <span
                  className={cn(
                    "text-sm leading-snug",
                    isDone && "line-through text-muted-foreground",
                  )}
                >
                  {subtask.title}
                </span>
              </div>
            );
          })}

          <form action={addAction} className="flex items-center gap-2 pt-1">
            <input type="hidden" name="parentId" value={parentId} />
            <Input
              name="title"
              placeholder="Add subtask..."
              className="h-7 text-xs"
              disabled={isAddPending}
              key={`subtask-input-${subtasks.length}`}
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-xs"
              disabled={isAddPending}
            >
              {isAddPending ? "Adding..." : "Add"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
