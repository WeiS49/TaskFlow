"use client";

import { useActionState, useRef } from "react";
import { createTask } from "@/actions/task-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { ActionResult } from "@/lib/auth-utils";
import type { Task } from "@/db/schema";

interface TaskFormProps {
  defaultTimeBlock?: string;
  defaultProjectId?: string;
}

export function TaskForm({ defaultTimeBlock, defaultProjectId }: TaskFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult<Task> | null, formData: FormData) => {
      const result = await createTask(_prev, formData);
      if (result.success) {
        formRef.current?.reset();
      }
      return result;
    },
    null,
  );

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-2">
      {defaultTimeBlock && (
        <input type="hidden" name="timeBlock" value={defaultTimeBlock} />
      )}
      {defaultProjectId && (
        <input type="hidden" name="projectId" value={defaultProjectId} />
      )}
      <div className="flex-1">
        <Input
          name="title"
          placeholder="Add a task..."
          required
          autoComplete="off"
          className="h-9 bg-transparent"
        />
      </div>
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        <Plus className="h-4 w-4" />
      </Button>
      {state && !state.success && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
    </form>
  );
}
