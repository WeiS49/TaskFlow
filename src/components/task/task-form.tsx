"use client";

import { useActionState, useRef, useState } from "react";
import { createTask } from "@/actions/task-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { PRIORITIES } from "@/lib/constants";
import type { ActionResult } from "@/lib/auth-utils";
import type { Task, Project } from "@/db/schema";

interface TaskFormProps {
  defaultTimeBlock?: string;
  defaultStartDate?: string;
  defaultProjectId?: string;
  projects?: Project[];
  onTaskCreated?: (task: Task) => void;
}

const PRIORITY_LABELS: Record<string, string> = {
  none: "None",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export function TaskForm({ defaultTimeBlock, defaultStartDate, defaultProjectId, projects = [], onTaskCreated }: TaskFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [priority, setPriority] = useState("none");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "none");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");

  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult<Task> | null, formData: FormData) => {
      if (priority !== "none") formData.set("priority", priority);
      if (projectId !== "none") formData.set("projectId", projectId);
      if (estimatedMinutes) formData.set("estimatedMinutes", estimatedMinutes);

      const result = await createTask(_prev, formData);
      if (result.success) {
        formRef.current?.reset();
        setExpanded(false);
        setPriority("none");
        setProjectId(defaultProjectId ?? "none");
        setEstimatedMinutes("");
        onTaskCreated?.(result.data);
      }
      return result;
    },
    null,
  );

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <div className="flex items-center gap-2">
        {defaultTimeBlock && (
          <input type="hidden" name="timeBlock" value={defaultTimeBlock} />
        )}
        {defaultStartDate && (
          <input type="hidden" name="startDate" value={defaultStartDate} />
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
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setExpanded(!expanded)}
          className="h-9 w-9 p-0"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        <Button type="submit" size="sm" variant="ghost" disabled={pending}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {expanded && (
        <div className="flex items-center gap-2 pl-1">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger size="sm" className="w-[100px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {projects.length > 0 && (
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger size="sm" className="w-[120px]">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Input
            type="number"
            min={1}
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)}
            placeholder="Min"
            className="h-8 w-[70px]"
          />
        </div>
      )}

      {state && !state.success && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
    </form>
  );
}
