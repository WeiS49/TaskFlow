"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchAll } from "@/actions/search-actions";

type SearchResults = Awaited<ReturnType<typeof searchAll>>;

export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    tasks: [],
    projects: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search
  const runSearch = useCallback(async (value: string) => {
    if (value.trim().length < 2) {
      setResults({ tasks: [], projects: [] });
      return;
    }
    setIsLoading(true);
    try {
      const data = await searchAll(value);
      setResults(data);
    } catch {
      setResults({ tasks: [], projects: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      runSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (!value) {
      setQuery("");
      setResults({ tasks: [], projects: [] });
    }
  }

  function handleSelectTask(taskId: string) {
    void taskId;
    router.push("/today");
    setOpen(false);
  }

  function handleSelectProject(projectId: string) {
    router.push(`/projects/${projectId}`);
    setOpen(false);
  }

  const hasResults =
    results.tasks.length > 0 || results.projects.length > 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Search"
      description="Search tasks and projects"
    >
      <CommandInput
        placeholder="Search tasks and projects..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!isLoading && query.trim().length >= 2 && !hasResults && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}
        {!isLoading && query.trim().length < 2 && (
          <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
        )}

        {results.tasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {results.tasks.map((task) => (
              <CommandItem
                key={task.id}
                value={`task-${task.id}-${task.title}`}
                onSelect={() => handleSelectTask(task.id)}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="truncate text-sm">{task.title}</span>
                  {task.project && (
                    <span className="text-xs text-muted-foreground truncate">
                      <span
                        className="inline-block size-2 rounded-full mr-1 align-middle"
                        style={{ backgroundColor: task.project.color }}
                      />
                      {task.project.name}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.projects.length > 0 && (
          <CommandGroup heading="Projects">
            {results.projects.map((project) => (
              <CommandItem
                key={project.id}
                value={`project-${project.id}-${project.name}`}
                onSelect={() => handleSelectProject(project.id)}
              >
                <span
                  className="inline-block size-3 rounded-full shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <span className="truncate text-sm">{project.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
