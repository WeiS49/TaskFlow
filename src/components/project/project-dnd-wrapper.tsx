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
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableTaskCard } from "@/components/daily-plan/sortable-task-card";
import { ChevronRight } from "lucide-react";
import { TaskCard } from "@/components/task/task-card";
import { TaskForm } from "@/components/task/task-form";
import { cn } from "@/lib/utils";
import { reorderProjectTask } from "@/actions/task-actions";
import type { TaskWithRelations } from "@/db/queries";
import type { Project, Label, Task } from "@/db/schema";

interface ProjectDndWrapperProps {
  tasks: TaskWithRelations[];
  projects: Project[];
  labels: Label[];
  projectId: string;
}

function calcPosition(tasks: TaskWithRelations[], targetIndex: number): number {
  if (tasks.length === 0) return 0;
  if (targetIndex <= 0) return tasks[0].position - 1;
  if (targetIndex >= tasks.length) return tasks[tasks.length - 1].position + 1;
  return (tasks[targetIndex - 1].position + tasks[targetIndex].position) / 2;
}

export function ProjectDndWrapper({ tasks: initialTasks, projects, labels, projectId }: ProjectDndWrapperProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.status === "done"), [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleComplete = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: "done" as const, completedAt: new Date() } : t,
      ),
    );
  }, []);

  const handleDelete = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const handleTaskUpdated = useCallback((task: Task) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              ...task,
              project: projects.find((p) => p.id === task.projectId) ?? null,
              taskLabels: t.taskLabels,
              subtasks: t.subtasks,
            }
          : t,
      ),
    );
  }, [projects]);

  const handleTaskCreated = useCallback((task: Task) => {
    const taskWithRelations = {
      ...task,
      project: projects.find((p) => p.id === task.projectId) ?? null,
      taskLabels: [],
      subtasks: [],
    };
    setTasks((prev) => [...prev, taskWithRelations]);
  }, [projects]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTask(event.active.data.current?.task ?? null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    setTasks((prev) => {
      const active = prev.filter((t) => t.status !== "done");
      const oldIndex = active.findIndex((t) => t.id === activeId);
      const newIndex = active.findIndex((t) => t.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const updated = [...active];
      const [moved] = updated.splice(oldIndex, 1);
      updated.splice(newIndex, 0, moved);

      const position = calcPosition(
        updated.filter((t) => t.id !== activeId),
        newIndex,
      );
      queueMicrotask(() => reorderProjectTask(activeId, position));

      const completed = prev.filter((t) => t.status === "done");
      return [...updated, ...completed];
    });
  }, []);

  return (
    <DndContext
      id="project-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={activeTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2.5">
          {activeTasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} projects={projects} labels={labels} onComplete={handleComplete} onDelete={handleDelete} onTaskUpdated={handleTaskUpdated} />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeTask && (
          <div className="rotate-[2deg] scale-[1.02] opacity-90 shadow-lg rounded-xl">
            <TaskCard task={activeTask} projects={projects} labels={labels} />
          </div>
        )}
      </DragOverlay>

      <div className="mt-4">
        <TaskForm defaultProjectId={projectId} projects={projects} onTaskCreated={handleTaskCreated} />
      </div>

      {completedTasks.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", showCompleted && "rotate-90")} />
            Completed ({completedTasks.length})
          </button>
          {showCompleted && (
            <div className="mt-2 space-y-2 opacity-60">
              {completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} projects={projects} labels={labels} />
              ))}
            </div>
          )}
        </div>
      )}
    </DndContext>
  );
}
