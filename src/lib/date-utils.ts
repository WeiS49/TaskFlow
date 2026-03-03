/**
 * Timezone-aware date utilities.
 * All "today" calculations use the user's timezone instead of UTC.
 */

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
