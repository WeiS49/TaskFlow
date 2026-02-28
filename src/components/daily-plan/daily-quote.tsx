import { getQuoteForDate } from "@/lib/quotes";

interface DailyQuoteProps {
  date: string;
}

export function DailyQuote({ date }: DailyQuoteProps) {
  const quote = getQuoteForDate(date);

  return (
    <div className="rounded-lg bg-secondary/50 px-4 py-3">
      <p className="text-sm italic text-muted-foreground leading-relaxed">
        &ldquo;{quote.text}&rdquo;
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground/70">
        &mdash; {quote.author}
      </p>
    </div>
  );
}
