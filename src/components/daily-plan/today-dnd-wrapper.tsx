"use client";

import { useState, useCallback, useMemo } from "react";
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
import { ChevronRight } from "lucide-react";
import { SortableTimeBlock } from "./sortable-time-block";
import { TaskCard } from "@/components/task/task-card";
import { cn } from "@/lib/utils";
import { reorderTask } from "@/actions/task-actions";
import { setKeyTask } from "@/actions/daily-review-actions";
import { SCHEDULED_TIME_BLOCKS, type ScheduledTimeBlock } from "@/lib/constants";
import type { TaskWithRelations } from "@/db/queries";
import type { Project, Label, Task } from "@/db/schema";

interface TodayDndWrapperProps {
  grouped: Record<ScheduledTimeBlock, TaskWithRelations[]>;
  unscheduled: TaskWithRelations[];
  completedToday: TaskWithRelations[];
  projects: Project[];
  labels: Label[];
  today: string;
  keyTaskId: string | null;
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

/** Build a fingerprint from task IDs + key fields so we detect server data changes */
function dataFingerprint(
  grouped: Record<ScheduledTimeBlock, TaskWithRelations[]>,
  unscheduled: TaskWithRelations[],
  completed: TaskWithRelations[],
) {
  const parts: string[] = [];
  for (const block of SCHEDULED_TIME_BLOCKS) {
    parts.push(grouped[block].map((t) => `${t.id}:${t.estimatedMinutes ?? 0}`).join(","));
  }
  parts.push(unscheduled.map((t) => t.id).join(","));
  parts.push(completed.map((t) => t.id).join(","));
  return parts.join("|");
}

export function TodayDndWrapper({ grouped: initialGrouped, unscheduled: initialUnscheduled, completedToday, projects, labels, today, keyTaskId: initialKeyTaskId }: TodayDndWrapperProps) {
  const [grouped, setGrouped] = useState(initialGrouped);
  const [unscheduledTasks, setUnscheduledTasks] = useState(initialUnscheduled);
  const [completedTasks, setCompletedTasks] = useState(completedToday);
  const [showCompleted, setShowCompleted] = useState(false);
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const [currentKeyTaskId, setCurrentKeyTaskId] = useState(initialKeyTaskId);

  // Sync client state with server data after revalidation
  const serverFingerprint = useMemo(
    () => dataFingerprint(initialGrouped, initialUnscheduled, completedToday),
    [initialGrouped, initialUnscheduled, completedToday],
  );
  const [prevFingerprint, setPrevFingerprint] = useState(serverFingerprint);
  if (serverFingerprint !== prevFingerprint) {
    setPrevFingerprint(serverFingerprint);
    setGrouped(initialGrouped);
    setUnscheduledTasks(initialUnscheduled);
    setCompletedTasks(completedToday);
    setCurrentKeyTaskId(initialKeyTaskId);
  }

  const handleSetKeyTask = useCallback((taskId: string) => {
    const newId = currentKeyTaskId === taskId ? null : taskId;
    setCurrentKeyTaskId(newId);
    setKeyTask(today, newId);
  }, [currentKeyTaskId, today]);

  const handleComplete = useCallback((taskId: string) => {
    // Find task from current state snapshot (closure)
    let found: TaskWithRelations | undefined;
    for (const block of SCHEDULED_TIME_BLOCKS) {
      found = grouped[block].find((t) => t.id === taskId);
      if (found) break;
    }
    if (!found) found = unscheduledTasks.find((t) => t.id === taskId);

    // Flat, pure setState calls — no nesting
    setGrouped((prev) => {
      const updated = { ...prev };
      for (const block of SCHEDULED_TIME_BLOCKS) {
        updated[block] = prev[block].filter((t) => t.id !== taskId);
      }
      return updated;
    });
    setUnscheduledTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (found) {
      const done = { ...found, status: "done" as const, completedAt: new Date() };
      setCompletedTasks((prev) =>
        prev.some((t) => t.id === taskId) ? prev : [done, ...prev],
      );
    }
  }, [grouped, unscheduledTasks]);

  const handleUncomplete = useCallback((taskId: string) => {
    const task = completedTasks.find((t) => t.id === taskId);
    if (!task) return;
    const restored: TaskWithRelations = { ...task, status: "todo", completedAt: null };
    const block = restored.timeBlock as ScheduledTimeBlock;

    // Flat, pure setState calls — no nesting
    setCompletedTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (SCHEDULED_TIME_BLOCKS.includes(block)) {
      setGrouped((prev) => ({ ...prev, [block]: [...prev[block], restored] }));
    } else {
      setUnscheduledTasks((prev) => [...prev, restored]);
    }
  }, [completedTasks]);

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
    // Task moved to a different date → remove from today
    if (task.startDate && task.startDate !== today) {
      handleDelete(task.id);
      return;
    }

    const newBlock = task.timeBlock as ScheduledTimeBlock;
    const isScheduled = SCHEDULED_TIME_BLOCKS.includes(newBlock);

    // Find existing task to preserve relations
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

    // Update grouped: same block → map in-place; different block → filter + append
    setGrouped((prev) => {
      const updated = { ...prev };
      let movedFromGrouped = false;
      for (const block of SCHEDULED_TIME_BLOCKS) {
        const inThisBlock = prev[block].some((t) => t.id === task.id);
        if (inThisBlock && isScheduled && block === newBlock) {
          // Same block: preserve position
          updated[block] = prev[block].map((t) => t.id === task.id ? updatedTask : t);
          return updated;
        }
        if (inThisBlock) {
          updated[block] = prev[block].filter((t) => t.id !== task.id);
          movedFromGrouped = true;
        }
      }
      // Task moved from a grouped block (or from unscheduled) into a new scheduled block
      if (isScheduled && (movedFromGrouped || !prev[newBlock].some((t) => t.id === task.id))) {
        updated[newBlock] = [...updated[newBlock], updatedTask];
      }
      return updated;
    });

    // Update unscheduled: same → map in-place; different → filter or append
    setUnscheduledTasks((prev) => {
      const inUnscheduled = prev.some((t) => t.id === task.id);
      if (inUnscheduled && !isScheduled) {
        return prev.map((t) => t.id === task.id ? updatedTask : t);
      }
      if (inUnscheduled) {
        return prev.filter((t) => t.id !== task.id);
      }
      if (!isScheduled) {
        return [...prev, updatedTask];
      }
      return prev;
    });
  }, [projects, grouped, unscheduledTasks, today, handleDelete]);

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
          today={today}
          keyTaskId={currentKeyTaskId}
          onComplete={handleComplete}
          onDelete={handleDelete}
          onTaskCreated={handleTaskCreated}
          onTaskUpdated={handleTaskUpdated}
          onSetKeyTask={handleSetKeyTask}
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
              <TaskCard key={task.id} task={task} projects={projects} labels={labels} onComplete={handleComplete} onDelete={handleDelete} onTaskUpdated={handleTaskUpdated} isKeyTask={currentKeyTaskId === task.id} onSetKeyTask={() => handleSetKeyTask(task.id)} />
            ))}
          </div>
        </section>
      )}

      {completedTasks.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", showCompleted && "rotate-90")} />
            Completed ({completedTasks.length})
          </button>
          {showCompleted && (
            <div className="mt-2 space-y-2.5 pl-7 opacity-60">
              {completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} projects={projects} labels={labels} onUncomplete={handleUncomplete} />
              ))}
            </div>
          )}
        </div>
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
