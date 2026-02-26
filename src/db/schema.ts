import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  real,
  integer,
  date,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations, type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import { TASK_STATUSES, PRIORITIES, TIME_BLOCKS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Enums (single source of truth from constants.ts)
// ---------------------------------------------------------------------------

export const taskStatusEnum = pgEnum("task_status", [...TASK_STATUSES]);
export const priorityEnum = pgEnum("priority", [...PRIORITIES]);
export const timeBlockEnum = pgEnum("time_block", [...TIME_BLOCKS]);

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey(),
  email: varchar({ length: 255 }).notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  hashedPassword: text().notNull(),
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

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  tasks: many(tasks),
  labels: many(labels),
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

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type User = InferSelectModel<typeof users>;
export type Project = InferSelectModel<typeof projects>;
export type Task = InferSelectModel<typeof tasks>;
export type Label = InferSelectModel<typeof labels>;
export type NewUser = InferInsertModel<typeof users>;
export type NewProject = InferInsertModel<typeof projects>;
export type NewTask = InferInsertModel<typeof tasks>;
export type NewLabel = InferInsertModel<typeof labels>;
