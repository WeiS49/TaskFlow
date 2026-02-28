"use client";

import { cn } from "@/lib/utils";

interface EnergySelectorProps {
  value?: number;
  onChange: (level: number) => void;
}

const ENERGY_LABELS = ["Very low", "Low", "Medium", "High", "Very high"];

export function EnergySelector({ value, onChange }: EnergySelectorProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">Energy</span>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            type="button"
            title={ENERGY_LABELS[level - 1]}
            onClick={() => onChange(level)}
            className={cn(
              "h-3.5 w-3.5 rounded-full border-2 transition-all",
              value && value >= level
                ? "border-amber-400 bg-amber-400"
                : "border-muted-foreground/30 bg-transparent hover:border-amber-400/60",
            )}
          />
        ))}
        {value && (
          <span className="ml-1 text-[10px] text-muted-foreground">
            {ENERGY_LABELS[value - 1]}
          </span>
        )}
      </div>
    </div>
  );
}
