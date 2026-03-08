"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DayStats } from "@/db/queries";
import { DayReviewDialog } from "./day-review-dialog";

const MOOD_EMOJI: Record<string, string> = {
  exhausted: "😫",
  meh: "😐",
  okay: "🙂",
  good: "😊",
  great: "🔥",
};

interface StatsChartProps {
  stats7: DayStats[];
  stats30: DayStats[];
}

type Period = "7" | "30";

function BarChart({
  data,
  valueKey,
  color,
  formatValue,
  onBarClick,
}: {
  data: DayStats[];
  valueKey: "completedCount" | "totalMinutes";
  color: string;
  formatValue: (v: number) => string;
  onBarClick?: (date: string) => void;
}) {
  const values = data.map((d) => d[valueKey]);
  const max = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => {
        const value = d[valueKey];
        const height = (value / max) * 100;
        const dayLabel = new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
          weekday: "short",
        });
        const dateLabel = new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer"
            onClick={() => onBarClick?.(d.date)}
          >
            <div className="w-full flex flex-col items-center justify-end h-32">
              <div
                className={cn("w-full max-w-8 rounded-t-sm transition-all", color)}
                style={{ height: `${Math.max(height, 2)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground truncate w-full text-center">
              {data.length <= 7
                ? dayLabel
                : (i % 5 === 0 || i === data.length - 1)
                  ? dateLabel
                  : ""}
            </span>
            {/* Tooltip */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover text-popover-foreground border border-border rounded-md px-2 py-1 text-xs whitespace-nowrap shadow-md z-10">
              {formatValue(value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendRow({
  data,
  label,
  renderDot,
}: {
  data: DayStats[];
  label: string;
  renderDot: (d: DayStats) => React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex justify-center">
            {renderDot(d)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsChart({ stats7, stats30 }: StatsChartProps) {
  const [period, setPeriod] = useState<Period>("7");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const data = period === "7" ? stats7 : stats30;

  const selectedStats = selectedDate ? data.find((d) => d.date === selectedDate) : undefined;

  return (
    <div className="space-y-6">
      {/* Period toggle */}
      <div className="flex gap-1 rounded-lg bg-secondary p-1 w-fit">
        {(["7", "30"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              period === p
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p} days
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Tasks completed per day
          </h3>
          <BarChart
            data={data}
            valueKey="completedCount"
            color="bg-emerald-500"
            formatValue={(v) => `${v} tasks`}
            onBarClick={setSelectedDate}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Minutes spent per day
          </h3>
          <BarChart
            data={data}
            valueKey="totalMinutes"
            color="bg-blue-500"
            formatValue={(v) => {
              const h = Math.floor(v / 60);
              const m = v % 60;
              return h > 0 ? `${h}h ${m}m` : `${m}m`;
            }}
            onBarClick={setSelectedDate}
          />
        </div>
      </div>

      {/* Mood & Energy trends */}
      <div className="grid gap-8 md:grid-cols-3">
        <TrendRow
          data={data}
          label="Mood"
          renderDot={(d) =>
            d.mood && MOOD_EMOJI[d.mood] ? (
              <span className="text-sm leading-none" title={d.mood}>
                {MOOD_EMOJI[d.mood]}
              </span>
            ) : (
              <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/20" />
            )
          }
        />
        <TrendRow
          data={data}
          label="Energy"
          renderDot={(d) =>
            d.energyLevel ? (
              <span
                className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500"
                style={{ opacity: 0.2 + (d.energyLevel / 5) * 0.8 }}
                title={`Energy ${d.energyLevel}/5`}
              />
            ) : (
              <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/20" />
            )
          }
        />
        <TrendRow
          data={data}
          label="Key task"
          renderDot={(d) =>
            d.keyTaskCompleted ? (
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            ) : (
              <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/20" />
            )
          }
        />
      </div>

      {/* Day review dialog */}
      <DayReviewDialog
        date={selectedDate}
        stats={selectedStats}
        onOpenChange={(open) => { if (!open) setSelectedDate(null); }}
      />
    </div>
  );
}
