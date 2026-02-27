"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createProject, updateProject } from "@/actions/project-actions";
import { cn } from "@/lib/utils";
import type { Project } from "@/db/schema";

const PRESET_COLORS = [
  "#6366F1",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
];

interface ProjectFormDialogProps {
  project?: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectFormDialog({
  project,
  open,
  onOpenChange,
}: ProjectFormDialogProps) {
  const isEdit = !!project;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(project?.name ?? "");
  const [color, setColor] = useState(project?.color ?? PRESET_COLORS[0]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name.trim());
      formData.set("color", color);

      const result = isEdit
        ? await updateProject(project.id, formData)
        : await createProject(null, formData);

      if (result.success) {
        toast.success(isEdit ? "Project updated" : "Project created");
        onOpenChange(false);
        router.refresh();
        if (!isEdit) {
          setName("");
          setColor(PRESET_COLORS[0]);
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-heading)]">
            {isEdit ? "Edit Project" : "New Project"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the project name and color."
              : "Create a new project to organize your tasks."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="project-name"
              className="text-sm font-medium leading-none"
            >
              Name
            </label>
            <Input
              id="project-name"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Color</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-8 w-8 rounded-full transition-all",
                    color === c
                      ? "ring-2 ring-offset-2 ring-ring scale-110"
                      : "hover:scale-105",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save"
                  : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
