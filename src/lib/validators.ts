import { z } from "zod";
import { TASK_STATUSES, PRIORITIES, TIME_BLOCKS } from "@/lib/constants";

// Auth
export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

// Task
export const taskCreateSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  projectId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  status: z.enum(TASK_STATUSES).default("todo"),
  priority: z.enum(PRIORITIES).default("none"),
  timeBlock: z.enum(TIME_BLOCKS).default("unscheduled"),
  startDate: z.string().date().optional(),
  dueDate: z.string().date().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial();

// Project
export const projectCreateSchema = z.object({
  name: z.string().min(1).max(255),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#6B7280"),
});

export const projectUpdateSchema = projectCreateSchema.partial();

// Label
export const labelCreateSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#6B7280"),
});

// Daily Review
export const dailyReviewSchema = z.object({
  energyLevel: z.number().int().min(1).max(5).optional(),
  mood: z.string().max(10).optional(),
  summary: z.string().max(1000).optional(),
});
