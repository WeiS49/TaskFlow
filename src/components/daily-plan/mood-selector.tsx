"use client";

import { cn } from "@/lib/utils";

interface MoodSelectorProps {
  value?: string;
  onChange: (mood: string) => void;
}

const MOODS = [
  { emoji: "\uD83D\uDE2B", value: "exhausted", label: "Exhausted" },
  { emoji: "\uD83D\uDE10", value: "meh", label: "Meh" },
  { emoji: "\uD83D\uDE42", value: "okay", label: "Okay" },
  { emoji: "\uD83D\uDE0A", value: "good", label: "Good" },
  { emoji: "\uD83D\uDD25", value: "great", label: "Great" },
];

export function MoodSelector({ value, onChange }: MoodSelectorProps) {
  const selected = MOODS.find((m) => m.value === value);

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">Mood</span>
      <div className="flex items-center gap-2">
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            type="button"
            title={mood.label}
            onClick={() => onChange(mood.value)}
            className={cn(
              "text-lg leading-none transition-all rounded-md p-0.5",
              value === mood.value
                ? "scale-125 ring-2 ring-primary/30 bg-secondary"
                : "opacity-50 hover:opacity-80 hover:scale-110",
            )}
          >
            {mood.emoji}
          </button>
        ))}
        {selected && (
          <span className="ml-1 text-[10px] text-muted-foreground">
            {selected.label}
          </span>
        )}
      </div>
    </div>
  );
}
