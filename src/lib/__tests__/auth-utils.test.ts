import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { Session } from "next-auth";

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn(),
}));
vi.mock("@/db", () => ({}));
vi.mock("@/db/schema", () => ({}));

import { requireAuth } from "@/lib/auth-utils";
import { auth } from "@/lib/auth";

// Cast auth to a simple mock function since vi.mocked infers NextMiddleware type
const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;

describe("requireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns userId when session is valid", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "a@b.com", name: "A", timezone: "UTC" },
      expires: "",
    });
    const id = await requireAuth();
    expect(id).toBe("user-123");
  });

  it("throws when session is null", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requireAuth()).rejects.toThrow("Unauthorized");
  });

  it("throws when session.user is undefined", async () => {
    mockAuth.mockResolvedValue({ expires: "" } as Session);
    await expect(requireAuth()).rejects.toThrow("Unauthorized");
  });

  it("throws when session.user.id is undefined", async () => {
    mockAuth.mockResolvedValue({
      user: { id: undefined as unknown as string, email: "", name: "", timezone: "" },
      expires: "",
    });
    await expect(requireAuth()).rejects.toThrow("Unauthorized");
  });
});
