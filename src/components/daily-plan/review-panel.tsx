"use client";

import { CheckCircle2, ArrowRight, Sparkles, Undo2, Star, Clock, BarChart3, Repeat } from "lucide-react";
import { DailyQuote } from "./daily-quote";
import { EnergySelector } from "./energy-selector";
import { MoodSelector } from "./mood-selector";
import { upsertDailyReview } from "@/actions/daily-review-actions";
import { toggleTaskStatus } from "@/actions/task-actions";
import { useCallback, useRef, useState, useTransition } from "react";
import type { Task, Project, DailyReview } from "@/db/schema";
import type { RecurringCompletion } from "@/db/queries";

type CompletedTask = Task & { project: Project | null };

interface ReviewPanelProps {
  completedTasks: CompletedTask[];
  tomorrowTasks: CompletedTask[];
  review: DailyReview | null;
  date: string;
  recurringCompletions?: RecurringCompletion[];
  keyTaskId?: string | null;
}

export function ReviewPanel({ completedTasks, tomorrowTasks, review, date, recurringCompletions = [], keyTaskId }: ReviewPanelProps) {
  const [energyLevel, setEnergyLevel] = useState<number | undefined>(
    review?.energyLevel ?? undefined,
  );
  const [mood, setMood] = useState<string | undefined>(
    review?.mood ?? undefined,
  );
  const [summary, setSummary] = useState(review?.summary ?? "");
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const save = useCallback(
    (updates: { energyLevel?: number; mood?: string; summary?: string }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        startTransition(async () => {
          await upsertDailyReview(date, {
            energyLevel: updates.energyLevel ?? energyLevel,
            mood: updates.mood ?? mood,
            summary: updates.summary ?? summary,
          });
        });
      }, 500);
    },
    [date, energyLevel, mood, summary],
  );

  function handleEnergyChange(level: number) {
    setEnergyLevel(level);
    save({ energyLevel: level });
  }

  function handleMoodChange(value: string) {
    setMood(value);
    save({ mood: value });
  }

  function handleSummaryBlur() {
    save({ summary });
  }

  return (
    <aside className="w-80 shrink-0 space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-[family-name:var(--font-heading)] text-sm font-medium text-muted-foreground">
          Daily Review
        </h2>
      </div>

      {/* Today's Stats */}
      {(() => {
        const totalCompleted = completedTasks.length + recurringCompletions.length;
        const totalMinutes =
          completedTasks.reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0) +
          recurringCompletions.reduce((sum, c) => sum + (c.estimatedMinutes ?? 0), 0);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const keyTask = keyTaskId ? completedTasks.find((t) => t.id === keyTaskId) : null;
        const keyTaskDone = !!keyTask;

        return (
          <section className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Today&apos;s Stats</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="text-xs text-foreground">{totalCompleted} completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-foreground">
                  {hours > 0 ? `${hours}h ` : ""}{mins}m
                </span>
              </div>
            </div>
            {keyTaskId && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <Star className={`h-3 w-3 ${keyTaskDone ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                <span className="text-xs text-foreground truncate">
                  {keyTaskDone ? "Key task done!" : "Key task pending"}
                </span>
              </div>
            )}
          </section>
        );
      })()}

      {/* Completed today */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs font-medium text-muted-foreground">
            Completed today ({completedTasks.length + recurringCompletions.length})
          </span>
        </div>
        {completedTasks.length === 0 && recurringCompletions.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 pl-5">
            No tasks completed yet.
          </p>
        ) : (
          <ul className="space-y-1.5 pl-5">
            {completedTasks.map((task) => (
              <li key={task.id} className="group/restore flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-foreground line-through opacity-70">
                    {task.title}
                  </span>
                  {task.project && (
                    <span
                      className="ml-1.5 text-[10px] opacity-50"
                      style={{ color: task.project.color }}
                    >
                      {task.project.name}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    startTransition(async () => {
                      await toggleTaskStatus(task.id);
                    });
                  }}
                  className="shrink-0 opacity-0 group-hover/restore:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  title="Restore task"
                >
                  <Undo2 className="h-3 w-3" />
                </button>
              </li>
            ))}
            {recurringCompletions.map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <Repeat className="mt-0.5 h-3 w-3 shrink-0 text-violet-500" />
                <span className="text-xs text-foreground line-through opacity-70">
                  {c.task.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Energy & Mood */}
      <section className="space-y-3">
        <EnergySelector value={energyLevel} onChange={handleEnergyChange} />
        <MoodSelector value={mood} onChange={handleMoodChange} />
      </section>

      {/* Summary */}
      <section className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          How was your day?
        </label>
        <textarea
          className="w-full resize-none rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          placeholder="Write a brief reflection..."
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={handleSummaryBlur}
        />
      </section>

      {/* Tomorrow preview */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <ArrowRight className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs font-medium text-muted-foreground">
            Tomorrow ({tomorrowTasks.length})
          </span>
        </div>
        {tomorrowTasks.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 pl-5">
            Nothing scheduled for tomorrow.
          </p>
        ) : (
          <ul className="space-y-1.5 pl-5">
            {tomorrowTasks.slice(0, 5).map((task) => (
              <li key={task.id} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <div className="min-w-0">
                  <span className="text-xs text-foreground">{task.title}</span>
                  {task.project && (
                    <span
                      className="ml-1.5 text-[10px] opacity-50"
                      style={{ color: task.project.color }}
                    >
                      {task.project.name}
                    </span>
                  )}
                </div>
              </li>
            ))}
            {tomorrowTasks.length > 5 && (
              <li className="text-[10px] text-muted-foreground/60 pl-3.5">
                +{tomorrowTasks.length - 5} more
              </li>
            )}
          </ul>
        )}
      </section>

      {/* Daily Quote */}
      <DailyQuote date={date} />
    </aside>
  );
}
