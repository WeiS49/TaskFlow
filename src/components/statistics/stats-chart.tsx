"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DayStats } from "@/db/queries";

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
}: {
  data: DayStats[];
  valueKey: "completedCount" | "totalMinutes";
  color: string;
  formatValue: (v: number) => string;
}) {
  const values = data.map((d) => d[valueKey]);
  const max = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d) => {
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
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="w-full flex flex-col items-center justify-end h-32">
              <div
                className={cn("w-full max-w-8 rounded-t-sm transition-all", color)}
                style={{ height: `${Math.max(height, 2)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground truncate w-full text-center">
              {data.length <= 7 ? dayLabel : dateLabel}
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

export function StatsChart({ stats7, stats30 }: StatsChartProps) {
  const [period, setPeriod] = useState<Period>("7");
  const data = period === "7" ? stats7 : stats30;

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
          />
        </div>
      </div>
    </div>
  );
}
