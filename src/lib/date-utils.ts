/**
 * Timezone-aware date utilities.
 * All "today" calculations use the user's timezone instead of UTC.
 */

import { startOfWeek, addDays, format } from "date-fns";

export function getLocalToday(timezone: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: timezone });
}

export function getLocalTomorrow(timezone: string): string {
  const now = new Date();
  const localNow = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  localNow.setDate(localNow.getDate() + 1);
  return localNow.toLocaleDateString("en-CA", { timeZone: timezone });
}

/**
 * Get the start and end of "today" in the user's timezone, as UTC Date objects.
 * Used for timestamp range queries (e.g. completedAt).
 */
export function getLocalDayRange(timezone: string): { start: Date; end: Date } {
  const todayStr = getLocalToday(timezone);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(new Date());
  const offsetPart = parts.find(p => p.type === "timeZoneName")?.value ?? "GMT";
  // Parse offset: "GMT+1" → "+01:00", "GMT-5" → "-05:00", "GMT" → "+00:00"
  const offsetStr = offsetPart.replace("GMT", "") || "+00:00";
  const normalizedOffset = normalizeOffset(offsetStr);
  const startUtc = new Date(`${todayStr}T00:00:00${normalizedOffset}`);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { start: startUtc, end: endUtc };
}

function normalizeOffset(offset: string): string {
  if (offset.includes(":")) return offset;
  // "+1" → "+01:00", "-5" → "-05:00", "+5:30" already handled
  const sign = offset[0] === "-" ? "-" : "+";
  const num = offset.replace(/^[+-]/, "");
  const hours = num.padStart(2, "0");
  return `${sign}${hours}:00`;
}

export interface WeekRange {
  start: string;
  end: string;
  days: string[];
}

export function getWeekRange(timezone: string, offsetWeeks: number = 0): WeekRange {
  const now = new Date();
  const localNow = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const monday = startOfWeek(localNow, { weekStartsOn: 1 });
  const offsetMonday = addDays(monday, offsetWeeks * 7);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(format(addDays(offsetMonday, i), "yyyy-MM-dd"));
  }

  return {
    start: days[0],
    end: days[6],
    days,
  };
}
