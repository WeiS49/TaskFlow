"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { DayColumn } from "./day-column";
import { TaskCard } from "@/components/task/task-card";
import { moveTaskToDate } from "@/actions/task-actions";
import type { TaskWithRelations } from "@/db/queries";
import type { Project, Label, Task } from "@/db/schema";

interface WeekDndWrapperProps {
  days: string[];
  tasks: TaskWithRelations[];
  projects: Project[];
  labels: Label[];
}

function groupByDate(tasks: TaskWithRelations[], days: string[]): Record<string, TaskWithRelations[]> {
  const grouped: Record<string, TaskWithRelations[]> = {};
  for (const day of days) {
    grouped[day] = [];
  }
  for (const task of tasks) {
    const date = task.startDate ?? "";
    if (grouped[date]) {
      grouped[date].push(task);
    }
  }
  return grouped;
}

function findDateContainer(grouped: Record<string, TaskWithRelations[]>, taskId: string): string | null {
  for (const [date, tasks] of Object.entries(grouped)) {
    if (tasks.some((t) => t.id === taskId)) return date;
  }
  return null;
}

function calcPosition(tasks: TaskWithRelations[], targetIndex: number): number {
  if (tasks.length === 0) return 0;
  if (targetIndex <= 0) return tasks[0].position - 1;
  if (targetIndex >= tasks.length) return tasks[tasks.length - 1].position + 1;
  return (tasks[targetIndex - 1].position + tasks[targetIndex].position) / 2;
}

/** Build a fingerprint from task IDs + startDates so we detect server data changes */
function dataFingerprint(tasks: TaskWithRelations[], days: string[]) {
  return tasks
    .map((t) => `${t.id}:${t.startDate ?? ""}:${t.position}`)
    .join(",") + "|" + days.join(",");
}

// pointerWithin finds containers reliably (including empty ones),
// rectIntersection provides fallback for item-level sorting
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return rectIntersection(args);
};

export function WeekDndWrapper({ days, tasks: initialTasks, projects, labels }: WeekDndWrapperProps) {
  const [grouped, setGrouped] = useState(() => groupByDate(initialTasks, days));
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);

  // Sync client state with server data after revalidation
  const serverFingerprint = useMemo(
    () => dataFingerprint(initialTasks, days),
    [initialTasks, days],
  );
  useEffect(() => {
    setGrouped(groupByDate(initialTasks, days));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverFingerprint]);

  const handleComplete = useCallback((taskId: string) => {
    setGrouped((prev) => {
      const updated = { ...prev };
      for (const date of Object.keys(updated)) {
        updated[date] = prev[date].filter((t) => t.id !== taskId);
      }
      return updated;
    });
  }, []);

  const handleDelete = useCallback((taskId: string) => {
    setGrouped((prev) => {
      const updated = { ...prev };
      for (const date of Object.keys(updated)) {
        updated[date] = prev[date].filter((t) => t.id !== taskId);
      }
      return updated;
    });
  }, []);

  const handleTaskUpdated = useCallback((task: Task) => {
    setGrouped((prev) => {
      const updated = { ...prev };
      for (const date of Object.keys(updated)) {
        const idx = prev[date].findIndex((t) => t.id === task.id);
        if (idx !== -1) {
          const existing = prev[date][idx];
          updated[date] = [...prev[date]];
          updated[date][idx] = {
            ...existing,
            ...task,
            project: projects.find((p) => p.id === task.projectId) ?? null,
            taskLabels: existing.taskLabels,
            subtasks: existing.subtasks,
          };
          return updated;
        }
      }
      return prev;
    });
  }, [projects]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTask(event.active.data.current?.task ?? null);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    setGrouped((prev) => {
      const fromDate = findDateContainer(prev, activeId);
      if (!fromDate) return prev;

      // Determine target date
      let toDate: string;
      if (prev[overId] !== undefined) {
        toDate = overId;
      } else {
        const found = findDateContainer(prev, overId);
        if (!found) return prev;
        toDate = found;
      }

      if (fromDate === toDate) return prev;

      const fromTasks = [...prev[fromDate]];
      const toTasks = [...prev[toDate]];
      const taskIndex = fromTasks.findIndex((t) => t.id === activeId);
      if (taskIndex === -1) return prev;

      const [movedTask] = fromTasks.splice(taskIndex, 1);

      const overIndex = toTasks.findIndex((t) => t.id === overId);
      const insertIndex = overIndex >= 0 ? overIndex : toTasks.length;
      toTasks.splice(insertIndex, 0, movedTask);

      return { ...prev, [fromDate]: fromTasks, [toDate]: toTasks };
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    setGrouped((prev) => {
      const container = findDateContainer(prev, activeId);
      if (!container) return prev;

      const tasks = [...prev[container]];
      const oldIndex = tasks.findIndex((t) => t.id === activeId);

      let newIndex: number;
      if (prev[overId] !== undefined) {
        newIndex = tasks.length - 1;
      } else {
        newIndex = tasks.findIndex((t) => t.id === overId);
        if (newIndex === -1) newIndex = oldIndex;
      }

      if (oldIndex !== newIndex) {
        const [moved] = tasks.splice(oldIndex, 1);
        tasks.splice(newIndex, 0, moved);
      }

      const position = calcPosition(
        tasks.filter((t) => t.id !== activeId),
        newIndex !== -1 ? newIndex : oldIndex,
      );

      // Defer server action to avoid setState-during-render
      queueMicrotask(async () => {
        try {
          const result = await moveTaskToDate(activeId, container, position);
          if (!result.success) {
            toast.error(result.error ?? "Failed to move task.");
          }
        } catch {
          toast.error("Failed to move task. Please try again.");
        }
      });

      // Update startDate in local state so UI reflects immediately
      const updatedTasks = tasks.map((t) =>
        t.id === activeId ? { ...t, startDate: container, position } : t,
      );

      return { ...prev, [container]: updatedTasks };
    });
  }, []);

  return (
    <DndContext
      id="week-dnd"
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-7 gap-3">
        {days.map((date) => (
          <DayColumn
            key={date}
            date={date}
            tasks={grouped[date] ?? []}
            projects={projects}
            labels={labels}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onTaskUpdated={handleTaskUpdated}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeTask && (
          <div className="rotate-[2deg] scale-[1.02] opacity-90 shadow-lg rounded-xl max-w-[200px]">
            <TaskCard task={activeTask} projects={projects} labels={labels} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
