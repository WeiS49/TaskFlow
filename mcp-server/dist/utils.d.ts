import type { Task, Project, Label, TimeBlock } from "./schema.js";
interface TaskWithRelations extends Task {
    project?: Project | null;
    subtasks?: Task[];
    taskLabels?: Array<{
        label: Label;
    }>;
}
export declare function formatTask(task: TaskWithRelations): string;
export declare function formatTaskList(tasks: TaskWithRelations[], heading?: string): string;
export declare function formatGroupedTasks(grouped: Record<TimeBlock, TaskWithRelations[]>): string;
export declare function getToday(): string;
export {};
