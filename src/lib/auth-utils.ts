import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function requireAuth(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

/** Read timezone directly from DB — always fresh, unlike JWT-cached value */
export async function getUserTimezone(userId: string): Promise<string> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { timezone: true },
  });
  return user?.timezone ?? "UTC";
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
