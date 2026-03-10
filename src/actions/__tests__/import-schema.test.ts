import { describe, it, expect } from "vitest";
import { z } from "zod";

// Re-define the import schema to test the validation contract
// (the original is not exported from data-actions.ts)
const recordArray = z.array(z.record(z.string(), z.unknown()));

const importSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  data: z.object({
    projects: recordArray,
    labels: recordArray,
    tasks: recordArray,
    taskLabels: z.array(
      z.object({ taskId: z.string(), labelId: z.string() }),
    ),
    dailyReviews: recordArray,
    taskCompletions: recordArray,
  }),
});

const validImport = {
  version: 1 as const,
  exportedAt: "2026-03-10T00:00:00.000Z",
  data: {
    projects: [{ id: "p1", name: "Work" }],
    labels: [{ id: "l1", name: "urgent" }],
    tasks: [{ id: "t1", title: "Buy milk" }],
    taskLabels: [{ taskId: "t1", labelId: "l1" }],
    dailyReviews: [],
    taskCompletions: [],
  },
};

describe("importSchema", () => {
  it("accepts a complete valid import object", () => {
    const result = importSchema.safeParse(validImport);
    expect(result.success).toBe(true);
  });

  it("rejects missing version", () => {
    const { version: _, ...rest } = validImport;
    expect(importSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects version !== 1", () => {
    expect(importSchema.safeParse({ ...validImport, version: 2 }).success).toBe(false);
  });

  it("rejects missing data.tasks", () => {
    const { tasks: _, ...dataRest } = validImport.data;
    expect(
      importSchema.safeParse({ ...validImport, data: dataRest }).success,
    ).toBe(false);
  });

  it("rejects taskLabels missing taskId", () => {
    const bad = {
      ...validImport,
      data: {
        ...validImport.data,
        taskLabels: [{ labelId: "l1" }],
      },
    };
    expect(importSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts all empty data arrays", () => {
    const empty = {
      version: 1 as const,
      exportedAt: "2026-03-10T00:00:00.000Z",
      data: {
        projects: [],
        labels: [],
        tasks: [],
        taskLabels: [],
        dailyReviews: [],
        taskCompletions: [],
      },
    };
    expect(importSchema.safeParse(empty).success).toBe(true);
  });
});
