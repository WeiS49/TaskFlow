"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, Star, Clock, Zap } from "lucide-react";
import { format } from "date-fns";
import { fetchDayReview } from "@/actions/daily-review-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { DayStats } from "@/db/queries";

const MOOD_MAP: Record<string, { emoji: string; label: string }> = {
  exhausted: { emoji: "😫", label: "Exhausted" },
  meh: { emoji: "😐", label: "Meh" },
  okay: { emoji: "🙂", label: "Okay" },
  good: { emoji: "😊", label: "Good" },
  great: { emoji: "🔥", label: "Great" },
};

type DayReview = Awaited<ReturnType<typeof fetchDayReview>>;

interface DayReviewDialogProps {
  date: string | null;
  stats: DayStats | undefined;
  onOpenChange: (open: boolean) => void;
}

export function DayReviewDialog({ date, stats, onOpenChange }: DayReviewDialogProps) {
  const [review, setReview] = useState<DayReview>(undefined);
  const [loading, startTransition] = useTransition();
  const prevDate = useRef<string | null>(null);

  useEffect(() => {
    if (!date || date === prevDate.current) return;
    prevDate.current = date;
    startTransition(async () => {
      const data = await fetchDayReview(date);
      setReview(data);
    });
  }, [date]);

  const formattedDate = date
    ? format(new Date(date + "T00:00:00"), "EEEE, MMM d")
    : "";

  const hours = stats ? Math.floor(stats.totalMinutes / 60) : 0;
  const mins = stats ? stats.totalMinutes % 60 : 0;

  return (
    <Dialog open={!!date} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{formattedDate}</DialogTitle>
          <DialogDescription className="sr-only">Daily review details</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-4">
            {/* Stats */}
            {stats && (
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-sm">{stats.completedCount} tasks</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-sm">
                    {hours > 0 ? `${hours}h ` : ""}{mins}m
                  </span>
                </div>
              </div>
            )}

            {/* Key Task */}
            {review?.keyTask && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2">
                <Star className={`h-3.5 w-3.5 ${stats?.keyTaskCompleted ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                <span className="text-sm truncate">{review.keyTask.title}</span>
              </div>
            )}

            {/* Mood & Energy */}
            {(review?.mood || review?.energyLevel) ? (
              <div className="flex gap-6">
                {review.mood && MOOD_MAP[review.mood] && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{MOOD_MAP[review.mood].emoji}</span>
                    <span className="text-sm text-muted-foreground">{MOOD_MAP[review.mood].label}</span>
                  </div>
                )}
                {review.energyLevel && (
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-sm text-muted-foreground">Energy {review.energyLevel}/5</span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Summary */}
            {review?.summary ? (
              <p className="text-sm text-foreground/80 leading-relaxed">{review.summary}</p>
            ) : !review?.mood && !review?.energyLevel && !review?.keyTask ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No review recorded</p>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
