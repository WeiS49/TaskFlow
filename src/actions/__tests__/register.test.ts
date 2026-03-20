import { describe, it, expect } from "vitest";
import { registerSchema } from "@/lib/validators";

describe("registerSchema", () => {
  it("rejects empty name", () => {
    const result = registerSchema.safeParse({
      name: "",
      email: "test@test.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      name: "Test",
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      name: "Test",
      email: "test@test.com",
      password: "12345",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid input", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "test@test.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name over 100 characters", () => {
    const result = registerSchema.safeParse({
      name: "a".repeat(101),
      email: "test@test.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});
