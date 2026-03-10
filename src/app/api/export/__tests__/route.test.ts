import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * Contract tests for the export/import data format.
 * Tests the schema validation and data transformation logic
 * without requiring database or auth infrastructure.
 */

// Re-define the import schema (mirrors data-actions.ts)
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

// Simulate what the export route produces (stripUserId logic)
function stripUserId<T extends { userId: string }>(
  rows: T[],
): Omit<T, "userId">[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return rows.map(({ userId: _uid, ...rest }) => rest);
}

function buildExportPayload(rawData: {
  projects: Array<{ id: string; userId: string; name: string }>;
  labels: Array<{ id: string; userId: string; name: string }>;
  tasks: Array<{ id: string; userId: string; title: string }>;
  taskLabels: Array<{ taskId: string; labelId: string }>;
  dailyReviews: Array<{ id: string; userId: string }>;
  taskCompletions: Array<{ id: string; userId: string }>;
}) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      projects: stripUserId(rawData.projects),
      labels: stripUserId(rawData.labels),
      tasks: stripUserId(rawData.tasks),
      taskLabels: rawData.taskLabels,
      dailyReviews: stripUserId(rawData.dailyReviews),
      taskCompletions: stripUserId(rawData.taskCompletions),
    },
  };
}

describe("Export/Import contract", () => {
  it("export payload passes import schema validation", () => {
    const payload = buildExportPayload({
      projects: [{ id: "p1", userId: "u1", name: "Work" }],
      labels: [{ id: "l1", userId: "u1", name: "urgent" }],
      tasks: [{ id: "t1", userId: "u1", title: "Buy milk" }],
      taskLabels: [{ taskId: "t1", labelId: "l1" }],
      dailyReviews: [{ id: "r1", userId: "u1" }],
      taskCompletions: [{ id: "c1", userId: "u1" }],
    });
    const result = importSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("stripUserId removes userId from all records", () => {
    const rows = [
      { id: "1", userId: "u1", name: "A" },
      { id: "2", userId: "u1", name: "B" },
    ];
    const stripped = stripUserId(rows);
    expect(stripped).toEqual([
      { id: "1", name: "A" },
      { id: "2", name: "B" },
    ]);
    const json = JSON.stringify(stripped);
    expect(json).not.toContain('"userId"');
  });

  it("export with empty data passes import schema", () => {
    const payload = buildExportPayload({
      projects: [],
      labels: [],
      tasks: [],
      taskLabels: [],
      dailyReviews: [],
      taskCompletions: [],
    });
    const result = importSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("export payload has correct structure", () => {
    const payload = buildExportPayload({
      projects: [],
      labels: [],
      tasks: [],
      taskLabels: [],
      dailyReviews: [],
      taskCompletions: [],
    });
    expect(payload).toHaveProperty("version", 1);
    expect(payload).toHaveProperty("exportedAt");
    expect(Object.keys(payload.data)).toEqual([
      "projects",
      "labels",
      "tasks",
      "taskLabels",
      "dailyReviews",
      "taskCompletions",
    ]);
  });
});
