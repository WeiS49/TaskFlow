"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";

interface WeekHeaderProps {
  start: string;
  end: string;
  offset: number;
}

export function WeekHeader({ start, end, offset }: WeekHeaderProps) {
  const startDate = parseISO(start);
  const endDate = parseISO(end);

  const label = `${format(startDate, "M月d日", { locale: zhCN })} — ${format(endDate, "M月d日", { locale: zhCN })}`;

  return (
    <div className="flex items-center gap-4">
      <h1 className="font-[family-name:var(--font-heading)] text-[28px] font-semibold">
        This Week
      </h1>
      <div className="flex items-center gap-1.5">
        <Link
          href={`/week?offset=${offset - 1}`}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        {offset !== 0 && (
          <Link
            href="/week"
            className="rounded-md px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Today
          </Link>
        )}
        <Link
          href={`/week?offset=${offset + 1}`}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
