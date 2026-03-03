export const APP_NAME = "TaskFlow";

export const TIME_BLOCKS = ["morning", "afternoon", "evening", "unscheduled"] as const;
export type TimeBlock = (typeof TIME_BLOCKS)[number];

export const SCHEDULED_TIME_BLOCKS = ["morning", "afternoon", "evening"] as const;
export type ScheduledTimeBlock = (typeof SCHEDULED_TIME_BLOCKS)[number];

export const PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const TASK_STATUSES = ["todo", "in_progress", "done", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const RECURRENCE_TYPES = ["daily", "weekly", "anytime"] as const;
export type RecurrenceType = (typeof RECURRENCE_TYPES)[number];
