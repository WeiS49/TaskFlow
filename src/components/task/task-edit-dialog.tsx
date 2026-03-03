"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarIcon, ChevronDown } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LabelPicker } from "@/components/label/label-picker";
import { SubtaskList } from "@/components/task/subtask-list";
import { cn } from "@/lib/utils";
import { PRIORITIES, TIME_BLOCKS, RECURRENCE_TYPES, type Priority, type TimeBlock, type RecurrenceType } from "@/lib/constants";
import type { TaskWithRelations } from "@/db/queries";
import type { Project, Label, Task } from "@/db/schema";

interface TaskEditDialogProps {
  task: TaskWithRelations;
  projects: Project[];
  labels: Label[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (taskId: string) => void;
  onTaskUpdated?: (task: Task) => void;
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
  onDelete,
  onTaskUpdated,
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
  const [isRecurring, setIsRecurring] = useState(task.isRecurring ?? false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    (task.recurrenceType as RecurrenceType) ?? "anytime",
  );

  const hasAdvancedData =
    (task.timeBlock as TimeBlock) !== "unscheduled" ||
    !!task.startDate ||
    !!task.dueDate ||
    !!task.estimatedMinutes ||
    (task.projectId !== null && task.projectId !== undefined) ||
    task.taskLabels.length > 0 ||
    (task.subtasks ?? []).length > 0 ||
    task.isRecurring;

  const [advancedOpen, setAdvancedOpen] = useState(hasAdvancedData);

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
      formData.set("isRecurring", isRecurring.toString());
      if (isRecurring) formData.set("recurrenceType", recurrenceType);

      const [taskResult, labelsResult] = await Promise.all([
        updateTask(task.id, formData),
        setTaskLabels(task.id, selectedLabelIds),
      ]);

      if (taskResult.success && labelsResult.success) {
        toast.success("Task updated");
        if (taskResult.data) onTaskUpdated?.(taskResult.data);
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
        onDelete?.(task.id);
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
          {/* Basic fields — always visible */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />

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

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="min-h-20"
          />

          {/* Advanced fields — collapsible */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground hover:text-foreground">
                {advancedOpen ? "Less settings" : "More settings"}
                <ChevronDown className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
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

                {/* Recurring */}
                <div className="space-y-1.5 col-span-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="accent-primary"
                    />
                    Recurring task
                  </label>
                  {isRecurring && (
                    <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as RecurrenceType)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_TYPES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Project */}
                <div className="space-y-1.5 col-span-2">
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

              {/* Subtasks */}
              <SubtaskList
                subtasks={task.subtasks ?? []}
                parentId={task.id}
                projects={projects}
                labels={labels}
              />
            </CollapsibleContent>
          </Collapsible>
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
