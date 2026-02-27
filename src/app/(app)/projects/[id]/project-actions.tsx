"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/actions/project-actions";
import { ProjectFormDialog } from "@/components/project/project-form-dialog";
import type { Project } from "@/db/schema";

interface ProjectActionsProps {
  project: Project;
}

export function ProjectActions({ project }: ProjectActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${project.name}"? Tasks will be kept but unlinked.`))
      return;

    startTransition(async () => {
      const result = await deleteProject(project.id);
      if (result.success) {
        toast.success("Project deleted");
        router.push("/tasks");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {isPending ? "Deleting..." : "Delete"}
        </Button>
      </div>

      <ProjectFormDialog
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
