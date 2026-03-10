import { describe, it, expect } from "vitest";
import {
  loginSchema,
  taskCreateSchema,
  projectCreateSchema,
  labelCreateSchema,
} from "@/lib/validators";

describe("taskCreateSchema", () => {
  it("accepts minimal valid input", () => {
    const result = taskCreateSchema.safeParse({ title: "Buy milk" });
    expect(result.success).toBe(true);
  });

  it("accepts fully populated input", () => {
    const result = taskCreateSchema.safeParse({
      title: "Deploy app",
      description: "Push to production",
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      status: "in_progress",
      priority: "high",
      timeBlock: "morning",
      startDate: "2026-03-10",
      dueDate: "2026-03-15",
      estimatedMinutes: 60,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = taskCreateSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects title exceeding 500 chars", () => {
    const result = taskCreateSchema.safeParse({ title: "a".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID for projectId", () => {
    const result = taskCreateSchema.safeParse({
      title: "Task",
      projectId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid enum values", () => {
    const result = taskCreateSchema.safeParse({
      title: "Task",
      priority: "critical",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const result = taskCreateSchema.safeParse({
      title: "Task",
      startDate: "March 10",
    });
    expect(result.success).toBe(false);
  });

  it("applies default values", () => {
    const result = taskCreateSchema.safeParse({ title: "Task" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("todo");
      expect(result.data.priority).toBe("none");
      expect(result.data.timeBlock).toBe("unscheduled");
    }
  });
});

describe("projectCreateSchema", () => {
  it("accepts valid input", () => {
    const result = projectCreateSchema.safeParse({ name: "Work" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = projectCreateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid color format", () => {
    const result = projectCreateSchema.safeParse({
      name: "Work",
      color: "red",
    });
    expect(result.success).toBe(false);
  });

  it("applies default color", () => {
    const result = projectCreateSchema.safeParse({ name: "Work" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.color).toBe("#6B7280");
    }
  });
});

describe("labelCreateSchema", () => {
  it("accepts valid input", () => {
    const result = labelCreateSchema.safeParse({ name: "urgent" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = labelCreateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "secret123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 6 chars", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "12345",
    });
    expect(result.success).toBe(false);
  });
});
