"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { createTask, updateTask, deleteTask, toggleTaskStatus } from "@/actions/task-actions";
import { TaskCheckbox } from "./task-checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Task, Project, Label } from "@/db/schema";

interface SubtaskListProps {
  subtasks: Task[];
  parentId: string;
  projects: Project[];
  labels: Label[];
  onSubtasksChange?: (subtasks: Task[]) => void;
}

export function SubtaskList({ subtasks, parentId, onSubtasksChange }: SubtaskListProps) {
  const [localSubtasks, setLocalSubtasks] = useState<Task[]>(subtasks);
  const [isExpanded, setIsExpanded] = useState(false);
  const [togglePendingIds, setTogglePendingIds] = useState<Set<string>>(new Set());
  const [deletePendingIds, setDeletePendingIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isAdding, startAddTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync from server revalidation
  useEffect(() => {
    setLocalSubtasks(subtasks);
  }, [subtasks]);

  // Notify parent of changes
  useEffect(() => {
    onSubtasksChange?.(localSubtasks);
  }, [localSubtasks, onSubtasksChange]);

  const doneCount = localSubtasks.filter((s) => s.status === "done").length;

  function handleToggle(subtaskId: string) {
    // Optimistic toggle
    setLocalSubtasks((prev) =>
      prev.map((s) =>
        s.id === subtaskId
          ? { ...s, status: s.status === "done" ? "todo" as const : "done" as const }
          : s,
      ),
    );
    setTogglePendingIds((prev) => new Set(prev).add(subtaskId));
    toggleTaskStatus(subtaskId).finally(() => {
      setTogglePendingIds((prev) => {
        const next = new Set(prev);
        next.delete(subtaskId);
        return next;
      });
    });
  }

  function handleAdd(formData: FormData) {
    const title = formData.get("title") as string;
    if (!title?.trim()) return;

    const tempId = crypto.randomUUID();
    const tempSubtask: Task = {
      id: tempId,
      userId: "",
      projectId: null,
      parentId,
      title: title.trim(),
      description: null,
      status: "todo",
      priority: "none",
      timeBlock: "unscheduled",
      position: localSubtasks.length,
      startDate: null,
      dueDate: null,
      estimatedMinutes: null,
      isRecurring: false,
      recurrenceType: null,
      completedAt: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Optimistic add
    setLocalSubtasks((prev) => [...prev, tempSubtask]);

    startAddTransition(async () => {
      const serverFormData = new FormData();
      serverFormData.set("title", title.trim());
      serverFormData.set("parentId", parentId);
      const result = await createTask(null, serverFormData);
      if (result?.success && result.data) {
        // Replace temp with real
        setLocalSubtasks((prev) =>
          prev.map((s) => (s.id === tempId ? { ...result.data!, userId: s.userId } as Task : s)),
        );
      } else {
        // Remove temp on failure
        setLocalSubtasks((prev) => prev.filter((s) => s.id !== tempId));
        toast.error("Failed to add subtask");
      }
    });

    // Reset form
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }

  function handleDelete(subtaskId: string) {
    const original = localSubtasks.find((s) => s.id === subtaskId);
    if (!original) return;

    // Optimistic delete
    setLocalSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    setDeletePendingIds((prev) => new Set(prev).add(subtaskId));

    deleteTask(subtaskId)
      .then((result) => {
        if (!result.success) {
          // Restore on failure
          setLocalSubtasks((prev) => [...prev, original]);
          toast.error("Failed to delete subtask");
        }
      })
      .catch(() => {
        setLocalSubtasks((prev) => [...prev, original]);
        toast.error("Failed to delete subtask");
      })
      .finally(() => {
        setDeletePendingIds((prev) => {
          const next = new Set(prev);
          next.delete(subtaskId);
          return next;
        });
      });
  }

  function startEdit(subtask: Task) {
    setEditingId(subtask.id);
    setEditValue(subtask.title);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  function handleEditSave(subtaskId: string) {
    const trimmed = editValue.trim();
    if (!trimmed) {
      cancelEdit();
      return;
    }

    // Optimistic update
    setLocalSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, title: trimmed } : s)),
    );
    setEditingId(null);

    const formData = new FormData();
    formData.set("title", trimmed);
    updateTask(subtaskId, formData).then((result) => {
      if (!result.success) {
        toast.error("Failed to update subtask");
      }
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
          {localSubtasks.length} subtask{localSubtasks.length !== 1 ? "s" : ""} (
          {doneCount} done)
        </span>
      </button>

      {isExpanded && (
        <div className="ml-2 space-y-1 border-l border-border pl-3">
          {localSubtasks.map((subtask) => {
            const isDone = subtask.status === "done";
            const isPending = togglePendingIds.has(subtask.id) || deletePendingIds.has(subtask.id);
            const isEditing = editingId === subtask.id;
            return (
              <div
                key={subtask.id}
                className={cn(
                  "group flex items-center gap-2 py-0.5",
                  isPending && "opacity-60",
                )}
              >
                <TaskCheckbox
                  checked={isDone}
                  onToggle={() => handleToggle(subtask.id)}
                  disabled={isPending}
                />
                {isEditing ? (
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEditSave(subtask.id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    onBlur={() => handleEditSave(subtask.id)}
                    className="h-6 text-xs flex-1"
                    autoFocus
                  />
                ) : (
                  <span
                    className={cn(
                      "text-sm leading-snug flex-1 cursor-pointer hover:text-primary",
                      isDone && "line-through text-muted-foreground",
                    )}
                    onClick={() => startEdit(subtask)}
                  >
                    {subtask.title}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(subtask.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  disabled={isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}

          <form action={handleAdd} className="flex items-center gap-2 pt-1">
            <Input
              ref={inputRef}
              name="title"
              placeholder="Add subtask..."
              className="h-7 text-xs"
              disabled={isAdding}
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-xs"
              disabled={isAdding}
            >
              {isAdding ? "Adding..." : "Add"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
