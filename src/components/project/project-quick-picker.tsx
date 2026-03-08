"use client";

import { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Project } from "@/db/schema";

interface ProjectQuickPickerProps {
  projects: Project[];
  currentProjectId: string | null;
  onSelect: (projectId: string | null) => void;
  children: React.ReactNode;
}

export function ProjectQuickPicker({
  projects,
  currentProjectId,
  onSelect,
  children,
}: ProjectQuickPickerProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(projectId: string | null) {
    setOpen(false);
    onSelect(projectId);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-1"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent",
            currentProjectId === null && "bg-accent",
          )}
          onClick={() => handleSelect(null)}
        >
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          <span className="text-muted-foreground">No project</span>
        </button>
        {projects.map((project) => (
          <button
            key={project.id}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent",
              currentProjectId === project.id && "bg-accent",
            )}
            onClick={() => handleSelect(project.id)}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <span className="truncate">{project.name}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
