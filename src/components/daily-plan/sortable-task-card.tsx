"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { TaskCard } from "@/components/task/task-card";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/db/queries";
import type { Project, Label } from "@/db/schema";

interface SortableTaskCardProps {
  task: TaskWithRelations;
  projects: Project[];
  labels: Label[];
  onComplete?: (taskId: string) => void;
}

export function SortableTaskCard({ task, projects, labels, onComplete }: SortableTaskCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
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

  function handleComplete(taskId: string) {
    setIsCompleting(true);
    setTimeout(() => {
      onComplete?.(taskId);
    }, 500);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group/sortable transition-all duration-500",
        isCompleting && "opacity-0 scale-95",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        suppressHydrationWarning
        className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover/sortable:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <TaskCard task={task} projects={projects} labels={labels} onComplete={onComplete ? handleComplete : undefined} />
    </div>
  );
}
