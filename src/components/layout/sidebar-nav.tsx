"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Plus } from "lucide-react";
import { signOut } from "next-auth/react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { ProjectFormDialog } from "@/components/project/project-form-dialog";
import type { Project, Label } from "@/db/schema";

interface SidebarNavProps {
  user: { id: string; name: string; email: string };
  projects: Project[];
  labels: Label[];
  todayTaskCount: number;
  todayDate: string;
}

const navItems = [
  { href: "/today", label: "Today", emoji: "✨" },
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
          {projects.map((project) => {
            const isActive = pathname === `/projects/${project.id}`;
            return (
              <Link
                key={project.id}
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
            );
          })}
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
