"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface TaskCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function TaskCheckbox({ checked, onToggle, disabled }: TaskCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-[#C5C0D8] hover:border-primary",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
  );
}
