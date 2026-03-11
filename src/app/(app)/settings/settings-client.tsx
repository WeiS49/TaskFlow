"use client";

import { useState, useRef, useTransition } from "react";
import { Download, Upload, AlertTriangle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { importData, updateTimezone } from "@/actions/data-actions";

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
];

interface SettingsClientProps {
  currentTimezone: string;
}

export function SettingsClient({ currentTimezone }: SettingsClientProps) {
  const [importing, setImporting] = useState(false);
  const [confirmFile, setConfirmFile] = useState<File | null>(null);
  const [timezone, setTimezone] = useState(currentTimezone);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setConfirmFile(file);
    e.target.value = "";
  }

  async function handleImport() {
    if (!confirmFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", confirmFile);
      const result = await importData(formData);
      if (result.success) {
        toast.success(`Imported ${result.data.count} records successfully`);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Import failed unexpectedly");
    } finally {
      setImporting(false);
      setConfirmFile(null);
    }
  }

  function handleTimezoneChange(newTimezone: string) {
    setTimezone(newTimezone);
    startTransition(async () => {
      const result = await updateTimezone(newTimezone);
      if (result.success) {
        toast.success(`Timezone updated to ${newTimezone}`);
      } else {
        setTimezone(currentTimezone);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-10 py-8">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold mb-6">
        Settings
      </h1>

      <div className="space-y-6">
        {/* Timezone */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Timezone
            </CardTitle>
            <CardDescription>
              Controls which day &quot;Today&quot; refers to and when tasks
              become visible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <select
              value={timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              disabled={isPending}
              className="w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            {isPending && (
              <p className="mt-2 text-xs text-muted-foreground">Saving...</p>
            )}
          </CardContent>
        </Card>

        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Data
            </CardTitle>
            <CardDescription>
              Download all your data as a JSON file. Includes projects, tasks,
              labels, daily reviews, and task completions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/api/export" download>
                Export JSON
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Data
            </CardTitle>
            <CardDescription>
              Restore data from a previously exported JSON file. This will
              replace all your current data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
            >
              {importing ? "Importing..." : "Choose JSON File"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!confirmFile}
        onOpenChange={(open) => !open && setConfirmFile(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Import
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>permanently replace</strong> all your current
              data with the contents of{" "}
              <strong>{confirmFile?.name}</strong>. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImport}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Replace All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
