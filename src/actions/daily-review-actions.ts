"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { dailyReviews } from "@/db/schema";
import { dailyReviewSchema } from "@/lib/validators";
import { requireAuth, type ActionResult } from "@/lib/auth-utils";
import type { DailyReview } from "@/db/schema";

export async function upsertDailyReview(
  date: string,
  data: { energyLevel?: number; mood?: string; summary?: string },
): Promise<ActionResult<DailyReview>> {
  try {
    const userId = await requireAuth();

    const parsed = dailyReviewSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const existing = await db.query.dailyReviews.findFirst({
      where: and(
        eq(dailyReviews.userId, userId),
        eq(dailyReviews.date, date),
      ),
    });

    let review: DailyReview;

    if (existing) {
      const [updated] = await db
        .update(dailyReviews)
        .set(parsed.data)
        .where(eq(dailyReviews.id, existing.id))
        .returning();
      review = updated;
    } else {
      const [created] = await db
        .insert(dailyReviews)
        .values({ ...parsed.data, userId, date })
        .returning();
      review = created;
    }

    revalidatePath("/today");
    return { success: true, data: review };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save review",
    };
  }
}
