"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Label } from "@/db/schema";

interface LabelPickerProps {
  labels: Label[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function LabelPicker({ labels, selectedIds, onChange }: LabelPickerProps) {
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  const selectedLabels = labels.filter((l) => selectedIds.includes(l.id));

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        Labels
      </label>

      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedLabels.map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              {label.name}
              <button
                type="button"
                onClick={() => toggle(label.id)}
                className="ml-0.5 rounded hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start text-muted-foreground font-normal">
            {selectedIds.length > 0
              ? `${selectedIds.length} selected`
              : "Select labels..."}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search labels..." />
            <CommandList>
              <CommandEmpty>No labels found.</CommandEmpty>
              <CommandGroup>
                {labels.map((label) => {
                  const isSelected = selectedIds.includes(label.id);
                  return (
                    <CommandItem
                      key={label.id}
                      onSelect={() => toggle(label.id)}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded border",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span
                        className="mr-2 h-2 w-2 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      {label.name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
