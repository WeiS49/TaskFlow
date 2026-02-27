"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { updateTask, deleteTask, setTaskLabels } from "@/actions/task-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { LabelPicker } from "@/components/label/label-picker";
import { cn } from "@/lib/utils";
import { PRIORITIES, TIME_BLOCKS, type Priority, type TimeBlock } from "@/lib/constants";
import type { TaskWithRelations } from "@/db/queries";
import type { Project, Label } from "@/db/schema";

interface TaskEditDialogProps {
  task: TaskWithRelations;
  projects: Project[];
  labels: Label[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIORITY_LABELS: Record<string, string> = {
  none: "None",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const TIME_BLOCK_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  unscheduled: "Unscheduled",
};

export function TaskEditDialog({
  task,
  projects,
  labels,
  open,
  onOpenChange,
}: TaskEditDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<Priority>(task.priority as Priority);
  const [timeBlock, setTimeBlock] = useState<TimeBlock>(task.timeBlock as TimeBlock);
  const [startDate, setStartDate] = useState<Date | undefined>(
    task.startDate ? new Date(task.startDate + "T00:00:00") : undefined,
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.dueDate ? new Date(task.dueDate + "T00:00:00") : undefined,
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    task.estimatedMinutes?.toString() ?? "",
  );
  const [projectId, setProjectId] = useState(task.projectId ?? "none");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(
    task.taskLabels.map((tl) => tl.label.id),
  );

  function handleSave() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("description", description);
      formData.set("priority", priority);
      formData.set("timeBlock", timeBlock);
      if (startDate)
        formData.set("startDate", format(startDate, "yyyy-MM-dd"));
      if (dueDate) formData.set("dueDate", format(dueDate, "yyyy-MM-dd"));
      if (estimatedMinutes)
        formData.set("estimatedMinutes", estimatedMinutes);
      if (projectId !== "none") formData.set("projectId", projectId);

      const [taskResult, labelsResult] = await Promise.all([
        updateTask(task.id, formData),
        setTaskLabels(task.id, selectedLabelIds),
      ]);

      if (taskResult.success && labelsResult.success) {
        toast.success("Task updated");
        onOpenChange(false);
      } else {
        const error = !taskResult.success
          ? taskResult.error
          : !labelsResult.success
            ? labelsResult.error
            : "Unknown error";
        toast.error(error);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (result.success) {
        toast.success("Task deleted");
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription className="sr-only">
            Edit task details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="min-h-20"
          />

          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Priority
              </label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Block */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Time Block
              </label>
              <Select value={timeBlock} onValueChange={(v) => setTimeBlock(v as TimeBlock)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_BLOCKS.map((tb) => (
                    <SelectItem key={tb} value={tb}>
                      {TIME_BLOCK_LABELS[tb]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Start Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Due Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Estimated Minutes */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Est. Minutes
              </label>
              <Input
                type="number"
                min={1}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                placeholder="30"
              />
            </div>

            {/* Project */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Project
              </label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span
                        className="mr-1.5 inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Labels */}
          <LabelPicker
            labels={labels}
            selectedIds={selectedLabelIds}
            onChange={setSelectedLabelIds}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Delete?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
              >
                Confirm
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </Button>
          )}
          <Button onClick={handleSave} disabled={isPending || !title.trim()}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
