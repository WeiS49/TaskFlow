"use client";

import { useState } from "react";
import { TaskCard } from "@/components/task/task-card";
import { TaskFilters } from "@/components/task/task-filters";
import type { TaskWithRelations } from "@/db/queries";
import type { Project, Label } from "@/db/schema";

interface TasksPageClientProps {
  tasks: TaskWithRelations[];
  projects: Project[];
  labels: Label[];
}

export function TasksPageClient({ tasks, projects, labels }: TasksPageClientProps) {
  const [filters, setFilters] = useState({ status: "all", priority: "all", projectId: "all" });

  const filtered = tasks.filter((task) => {
    if (filters.status !== "all" && task.status !== filters.status) return false;
    if (filters.priority !== "all" && task.priority !== filters.priority) return false;
    if (filters.projectId !== "all" && task.projectId !== filters.projectId) return false;
    return true;
  });

  return (
    <div className="space-y-6 px-10 py-8">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
          All Tasks
        </h1>
        <p className="text-sm text-muted-foreground">{filtered.length} tasks</p>
      </div>

      <TaskFilters projects={projects} filters={filters} onChange={setFilters} />

      <div className="space-y-2.5">
        {filtered.map((task) => (
          <TaskCard key={task.id} task={task} projects={projects} labels={labels} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No tasks match your filters</p>
      )}
    </div>
  );
}
