import { auth } from "@/lib/auth";

export async function requireAuth(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
