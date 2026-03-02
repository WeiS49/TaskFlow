"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { SortableTimeBlock } from "./sortable-time-block";
import { TaskCard } from "@/components/task/task-card";
import { reorderTask } from "@/actions/task-actions";
import { SCHEDULED_TIME_BLOCKS, type ScheduledTimeBlock } from "@/lib/constants";
import type { TaskWithRelations } from "@/db/queries";
import type { Project, Label, Task } from "@/db/schema";

interface TodayDndWrapperProps {
  grouped: Record<ScheduledTimeBlock, TaskWithRelations[]>;
  unscheduled: TaskWithRelations[];
  projects: Project[];
  labels: Label[];
}

function findContainer(
  grouped: Record<ScheduledTimeBlock, TaskWithRelations[]>,
  taskId: string,
): ScheduledTimeBlock | null {
  for (const block of SCHEDULED_TIME_BLOCKS) {
    if (grouped[block].some((t) => t.id === taskId)) {
      return block;
    }
  }
  return null;
}

function calcPosition(tasks: TaskWithRelations[], targetIndex: number): number {
  if (tasks.length === 0) return 0;
  if (targetIndex <= 0) return tasks[0].position - 1;
  if (targetIndex >= tasks.length) return tasks[tasks.length - 1].position + 1;
  return (tasks[targetIndex - 1].position + tasks[targetIndex].position) / 2;
}

export function TodayDndWrapper({ grouped: initialGrouped, unscheduled: initialUnscheduled, projects, labels }: TodayDndWrapperProps) {
  const [grouped, setGrouped] = useState(initialGrouped);
  const [unscheduledTasks, setUnscheduledTasks] = useState(initialUnscheduled);
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);

  const handleComplete = useCallback((taskId: string) => {
    setGrouped((prev) => {
      const updated = { ...prev };
      for (const block of SCHEDULED_TIME_BLOCKS) {
        updated[block] = prev[block].filter((t) => t.id !== taskId);
      }
      return updated;
    });
    setUnscheduledTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const handleDelete = useCallback((taskId: string) => {
    setGrouped((prev) => {
      const updated = { ...prev };
      for (const block of SCHEDULED_TIME_BLOCKS) {
        updated[block] = prev[block].filter((t) => t.id !== taskId);
      }
      return updated;
    });
    setUnscheduledTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const handleTaskUpdated = useCallback((task: Task) => {
    const newBlock = task.timeBlock as ScheduledTimeBlock;
    const isScheduled = SCHEDULED_TIME_BLOCKS.includes(newBlock);

    // Find existing task from either grouped or unscheduled to preserve relations
    const findExisting = (): TaskWithRelations | null => {
      for (const block of SCHEDULED_TIME_BLOCKS) {
        const found = grouped[block].find((t) => t.id === task.id);
        if (found) return found;
      }
      return unscheduledTasks.find((t) => t.id === task.id) ?? null;
    };
    const existing = findExisting();
    if (!existing) return;

    const updatedTask: TaskWithRelations = {
      ...existing,
      ...task,
      project: projects.find((p) => p.id === task.projectId) ?? null,
      taskLabels: existing.taskLabels,
      subtasks: existing.subtasks,
    };

    // Remove from all lists
    setGrouped((prev) => {
      const updated = { ...prev };
      for (const block of SCHEDULED_TIME_BLOCKS) {
        updated[block] = prev[block].filter((t) => t.id !== task.id);
      }
      if (isScheduled) {
        updated[newBlock] = [...updated[newBlock], updatedTask];
      }
      return updated;
    });
    setUnscheduledTasks((prev) => {
      const without = prev.filter((t) => t.id !== task.id);
      return isScheduled ? without : [...without, updatedTask];
    });
  }, [projects, grouped, unscheduledTasks]);

  const handleTaskCreated = useCallback((task: Task) => {
    const block = task.timeBlock as ScheduledTimeBlock;
    const isScheduled = SCHEDULED_TIME_BLOCKS.includes(block);
    const taskWithRelations: TaskWithRelations = {
      ...task,
      project: projects.find((p) => p.id === task.projectId) ?? null,
      taskLabels: [],
      subtasks: [],
    };
    if (isScheduled) {
      setGrouped((prev) => ({
        ...prev,
        [block]: [...prev[block], taskWithRelations],
      }));
    } else {
      setUnscheduledTasks((prev) => [...prev, taskWithRelations]);
    }
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
      const fromBlock = findContainer(prev, activeId);
      if (!fromBlock) return prev;

      // Determine target container
      let toBlock: ScheduledTimeBlock;
      if (SCHEDULED_TIME_BLOCKS.includes(overId as ScheduledTimeBlock)) {
        toBlock = overId as ScheduledTimeBlock;
      } else {
        const found = findContainer(prev, overId);
        if (!found) return prev;
        toBlock = found;
      }

      if (fromBlock === toBlock) return prev;

      const fromTasks = [...prev[fromBlock]];
      const toTasks = [...prev[toBlock]];
      const taskIndex = fromTasks.findIndex((t) => t.id === activeId);
      if (taskIndex === -1) return prev;

      const [movedTask] = fromTasks.splice(taskIndex, 1);

      // Find insert position
      const overIndex = toTasks.findIndex((t) => t.id === overId);
      const insertIndex = overIndex >= 0 ? overIndex : toTasks.length;
      toTasks.splice(insertIndex, 0, movedTask);

      return { ...prev, [fromBlock]: fromTasks, [toBlock]: toTasks };
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Read current state to compute new order, then update state and persist separately
    setGrouped((prev) => {
      const container = findContainer(prev, activeId);
      if (!container) return prev;

      const tasks = [...prev[container]];
      const oldIndex = tasks.findIndex((t) => t.id === activeId);

      let newIndex: number;
      if (SCHEDULED_TIME_BLOCKS.includes(overId as ScheduledTimeBlock)) {
        newIndex = tasks.length - 1;
      } else {
        newIndex = tasks.findIndex((t) => t.id === overId);
        if (newIndex === -1) newIndex = oldIndex;
      }

      if (oldIndex !== newIndex) {
        const [moved] = tasks.splice(oldIndex, 1);
        tasks.splice(newIndex, 0, moved);

        const position = calcPosition(
          tasks.filter((t) => t.id !== activeId),
          newIndex,
        );
        // Defer server action to avoid setState-during-render
        queueMicrotask(() => reorderTask(activeId, position, container));

        return { ...prev, [container]: tasks };
      }

      const position = calcPosition(
        tasks.filter((t) => t.id !== activeId),
        oldIndex,
      );
      queueMicrotask(() => reorderTask(activeId, position, container));

      return prev;
    });
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {SCHEDULED_TIME_BLOCKS.map((block) => (
        <SortableTimeBlock
          key={block}
          timeBlock={block}
          tasks={grouped[block]}
          projects={projects}
          labels={labels}
          onComplete={handleComplete}
          onDelete={handleDelete}
          onTaskCreated={handleTaskCreated}
          onTaskUpdated={handleTaskUpdated}
        />
      ))}

      {unscheduledTasks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="font-[family-name:var(--font-heading)] text-sm font-medium text-muted-foreground whitespace-nowrap">
              Unscheduled
            </span>
            <hr className="flex-1 border-border" />
          </div>
          <div className="space-y-2.5 pl-7">
            {unscheduledTasks.map((task) => (
              <TaskCard key={task.id} task={task} projects={projects} labels={labels} onComplete={handleComplete} onDelete={handleDelete} onTaskUpdated={handleTaskUpdated} />
            ))}
          </div>
        </section>
      )}

      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeTask && (
          <div className="rotate-[2deg] scale-[1.02] opacity-90 shadow-lg rounded-xl">
            <TaskCard task={activeTask} projects={projects} labels={labels} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
