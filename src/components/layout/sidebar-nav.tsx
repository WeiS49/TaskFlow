"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LogOut, Plus, GripVertical, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { ProjectFormDialog } from "@/components/project/project-form-dialog";
import { reorderProject } from "@/actions/project-actions";
import type { Project, Label } from "@/db/schema";

interface SidebarNavProps {
  user: { id: string; name: string; email: string };
  projects: Project[];
  labels: Label[];
  todayTaskCount: number;
  todayDate: string;
}

function SortableProject({ project, isActive }: { project: Project; isActive: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/project relative">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/project:opacity-100 cursor-grab active:cursor-grabbing transition-opacity z-10"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      <Link
        href={`/projects/${project.id}`}
        className={cn(
          "flex items-center gap-2.5 px-5 py-2.5 text-sm transition-colors",
          isActive
            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        )}
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: project.color }}
        />
        {project.name}
      </Link>
    </div>
  );
}

function calcPosition(items: Project[], targetIndex: number): number {
  if (items.length === 0) return 0;
  if (targetIndex <= 0) return items[0].position - 1;
  if (targetIndex >= items.length) return items[items.length - 1].position + 1;
  return (items[targetIndex - 1].position + items[targetIndex].position) / 2;
}

const navItems = [
  { href: "/today", label: "Today", emoji: "✨" },
  { href: "/week", label: "This Week", emoji: "📅" },
  { href: "/tasks", label: "All Tasks", emoji: "📋" },
  { href: "/statistics", label: "Statistics", emoji: "📊" },
];

export function SidebarNav({
  user,
  projects,
  labels,
  todayTaskCount,
  todayDate,
}: SidebarNavProps) {
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);
  const [sortedProjects, setSortedProjects] = useState(projects);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSortedProjects((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const updated = [...prev];
      const [moved] = updated.splice(oldIndex, 1);
      updated.splice(newIndex, 0, moved);

      const position = calcPosition(
        updated.filter((p) => p.id !== moved.id),
        newIndex,
      );

      queueMicrotask(() => reorderProject(moved.id, position));

      return updated;
    });
  }, []);

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="px-5 pb-6 pt-6">
        <h2 className="font-[family-name:var(--font-heading)] text-[22px] font-semibold">
          TaskFlow
        </h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {format(new Date(todayDate + "T00:00:00"), "yyyy年M月d日 · EEEE", { locale: zhCN })}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        <div>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const count =
              item.href === "/today" ? todayTaskCount : undefined;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-5 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <span>{item.emoji}</span>
                {item.label}
                {count !== undefined && count > 0 && (
                  <span className="ml-auto rounded-lg bg-sidebar-accent px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <hr className="mx-5 my-4 border-sidebar-border" />

        {/* Projects */}
        <div>
          <div className="mb-1 px-5 flex items-center justify-between">
            <h3 className="font-[family-name:var(--font-heading)] text-[13px] font-semibold text-muted-foreground">
              Projects
            </h3>
            <button
              onClick={() => setCreateOpen(true)}
              className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedProjects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {sortedProjects.map((project) => (
                <SortableProject
                  key={project.id}
                  project={project}
                  isActive={pathname === `/projects/${project.id}`}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <hr className="mx-5 my-4 border-sidebar-border" />

        {/* Labels */}
        {labels.length > 0 && (
          <div>
            <h3 className="mb-1 px-5 font-[family-name:var(--font-heading)] text-[13px] font-semibold text-muted-foreground">
              Labels
            </h3>
            {labels.map((label) => (
              <div
                key={label.id}
                className="flex items-center gap-2.5 px-5 py-2.5 text-sm text-sidebar-foreground/70"
              >
                <span className="text-xs" style={{ color: label.color }}>
                  #
                </span>
                {label.name}
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-muted-foreground truncate">
            {user.email}
          </span>
          <ThemeToggle />
        </div>
        <Link
          href="/settings"
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
            pathname === "/settings"
              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
      <ProjectFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </aside>
  );
}
