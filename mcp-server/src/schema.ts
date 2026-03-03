import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  real,
  boolean,
  integer,
  date,
  primaryKey,
  unique,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import {
  relations,
  type InferSelectModel,
  type InferInsertModel,
} from "drizzle-orm";

// Constants (source of truth: src/lib/constants.ts)
export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "done",
  "cancelled",
] as const;
export const PRIORITIES = [
  "none",
  "low",
  "medium",
  "high",
  "urgent",
] as const;
export const TIME_BLOCKS = [
  "morning",
  "afternoon",
  "evening",
  "unscheduled",
] as const;
export const RECURRENCE_TYPES = ["daily", "weekly", "anytime"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type TimeBlock = (typeof TIME_BLOCKS)[number];
export type RecurrenceType = (typeof RECURRENCE_TYPES)[number];

// Enums
export const taskStatusEnum = pgEnum("task_status", [...TASK_STATUSES]);
export const priorityEnum = pgEnum("priority", [...PRIORITIES]);
export const timeBlockEnum = pgEnum("time_block", [...TIME_BLOCKS]);
export const recurrenceTypeEnum = pgEnum("recurrence_type", [...RECURRENCE_TYPES]);

// Tables
export const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey(),
  email: varchar({ length: 255 }).notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  hashedPassword: text().notNull(),
  timezone: varchar({ length: 50 }).notNull().default("UTC"),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const projects = pgTable("projects", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar({ length: 255 }).notNull(),
  color: varchar({ length: 7 }).notNull().default("#6B7280"),
  position: real().notNull().default(0),
  deletedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const tasks = pgTable("tasks", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid().references(() => projects.id, { onDelete: "set null" }),
  parentId: uuid().references((): AnyPgColumn => tasks.id, {
    onDelete: "cascade",
  }),
  title: varchar({ length: 500 }).notNull(),
  description: text(),
  status: taskStatusEnum().notNull().default("todo"),
  priority: priorityEnum().notNull().default("none"),
  timeBlock: timeBlockEnum().notNull().default("unscheduled"),
  position: real().notNull().default(0),
  startDate: date({ mode: "string" }),
  dueDate: date({ mode: "string" }),
  estimatedMinutes: integer(),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurrenceType: recurrenceTypeEnum(),
  completedAt: timestamp({ withTimezone: true }),
  deletedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const labels = pgTable("labels", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar({ length: 100 }).notNull(),
  color: varchar({ length: 7 }).notNull().default("#6B7280"),
  deletedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const taskLabels = pgTable(
  "task_labels",
  {
    taskId: uuid()
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    labelId: uuid()
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.labelId] })],
);

export const dailyReviews = pgTable("daily_reviews", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: date({ mode: "string" }).notNull(),
  keyTaskId: uuid().references(() => tasks.id, { onDelete: "set null" }),
  energyLevel: integer(),
  mood: varchar({ length: 10 }),
  summary: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (t) => [unique().on(t.userId, t.date)]);

export const taskCompletions = pgTable("task_completions", {
  id: uuid().defaultRandom().primaryKey(),
  taskId: uuid()
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  completedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  date: date({ mode: "string" }).notNull(),
  estimatedMinutes: integer(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  tasks: many(tasks),
  labels: many(labels),
  dailyReviews: many(dailyReviews),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  parent: one(tasks, {
    fields: [tasks.parentId],
    references: [tasks.id],
    relationName: "subtasks",
  }),
  subtasks: many(tasks, { relationName: "subtasks" }),
  taskLabels: many(taskLabels),
  completions: many(taskCompletions),
}));

export const labelsRelations = relations(labels, ({ one, many }) => ({
  user: one(users, { fields: [labels.userId], references: [users.id] }),
  taskLabels: many(taskLabels),
}));

export const taskLabelsRelations = relations(taskLabels, ({ one }) => ({
  task: one(tasks, { fields: [taskLabels.taskId], references: [tasks.id] }),
  label: one(labels, {
    fields: [taskLabels.labelId],
    references: [labels.id],
  }),
}));

export const dailyReviewsRelations = relations(dailyReviews, ({ one }) => ({
  user: one(users, { fields: [dailyReviews.userId], references: [users.id] }),
  keyTask: one(tasks, { fields: [dailyReviews.keyTaskId], references: [tasks.id] }),
}));

export const taskCompletionsRelations = relations(taskCompletions, ({ one }) => ({
  task: one(tasks, { fields: [taskCompletions.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskCompletions.userId], references: [users.id] }),
}));

// Type exports
export type User = InferSelectModel<typeof users>;
export type Project = InferSelectModel<typeof projects>;
export type Task = InferSelectModel<typeof tasks>;
export type Label = InferSelectModel<typeof labels>;
export type NewTask = InferInsertModel<typeof tasks>;
export type DailyReview = InferSelectModel<typeof dailyReviews>;
export type TaskCompletion = InferSelectModel<typeof taskCompletions>;
