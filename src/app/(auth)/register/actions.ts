"use server";

import { db } from "@/db";
import { users, projects, tasks } from "@/db/schema";
import { registerSchema } from "@/lib/validators";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { eq, count } from "drizzle-orm";
import { format, addDays } from "date-fns";

const MAX_USERS = 50;
const DISPLAY_OFFSET = 24;
const REAL_LIMIT = MAX_USERS - DISPLAY_OFFSET; // 26

export async function getRegistrationInfo() {
  const [{ value: userCount }] = await db
    .select({ value: count() })
    .from(users);
  const remaining = MAX_USERS - (userCount + DISPLAY_OFFSET);
  return { remaining, closed: userCount >= REAL_LIMIT };
}

export async function registerAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, email, password } = parsed.data;

  // Check user cap
  const [{ value: userCount }] = await db
    .select({ value: count() })
    .from(users);
  if (userCount >= REAL_LIMIT) {
    return {
      error: "Registration is currently closed. All 50 spots have been taken.",
    };
  }

  // Check duplicate email
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  // Create user
  const hashedPassword = await bcrypt.hash(password, 12);
  const [newUser] = await db
    .insert(users)
    .values({ email, name, hashedPassword })
    .returning({ id: users.id });

  // Create sample data
  const today = new Date();
  const fmtDate = (d: Date) => format(d, "yyyy-MM-dd");

  const [project] = await db
    .insert(projects)
    .values({
      userId: newUser.id,
      name: "Getting Started",
      color: "#6366F1",
      position: 0,
    })
    .returning({ id: projects.id });

  await db.insert(tasks).values([
    {
      userId: newUser.id,
      projectId: project.id,
      title: "Drag me to a different time block",
      timeBlock: "morning",
      priority: "high",
      startDate: fmtDate(today),
      dueDate: fmtDate(today),
      position: 0,
    },
    {
      userId: newUser.id,
      projectId: project.id,
      title: "Click to edit my details",
      timeBlock: "afternoon",
      priority: "medium",
      startDate: fmtDate(today),
      dueDate: fmtDate(addDays(today, 2)),
      position: 1,
    },
    {
      userId: newUser.id,
      projectId: project.id,
      title: "Complete me by clicking the checkbox",
      timeBlock: "evening",
      priority: "low",
      startDate: fmtDate(today),
      dueDate: fmtDate(addDays(today, 1)),
      position: 2,
    },
    {
      userId: newUser.id,
      projectId: project.id,
      title: "I'll appear tomorrow (startDate demo)",
      timeBlock: "unscheduled",
      priority: "medium",
      startDate: fmtDate(addDays(today, 1)),
      dueDate: fmtDate(addDays(today, 3)),
      position: 3,
    },
  ]);

  // Auto-login
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/today",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created but auto-login failed. Please sign in manually." };
    }
    throw error; // re-throw NEXT_REDIRECT
  }

  return { error: null };
}
