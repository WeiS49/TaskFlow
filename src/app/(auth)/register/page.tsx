"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { registerAction, getRegistrationInfo } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, {
    error: null,
  });
  const [regInfo, setRegInfo] = useState<{
    remaining: number;
    closed: boolean;
  } | null>(null);

  useEffect(() => {
    getRegistrationInfo().then(setRegInfo);
  }, []);

  const closed = regInfo?.closed ?? false;

  return (
    <div className="w-full max-w-[400px] rounded-2xl border border-border bg-card p-10 shadow-[0_4px_24px_rgba(99,102,241,0.06)]">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF2FF]">
          <svg
            width="24"
            height="24"
            fill="none"
            stroke="#6366F1"
            strokeWidth="2"
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-[28px] font-semibold">
          TaskFlow
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {closed ? "Registration closed" : "Create your account"}
        </p>
      </div>

      {closed ? (
        <p className="text-center text-sm text-muted-foreground">
          All 50 spots have been taken. Registration is currently closed.
        </p>
      ) : (
        <>
          {/* Form */}
          <form action={formAction} className="grid gap-[18px]">
            <div className="grid gap-1.5">
              <Label htmlFor="name" className="text-[13px] font-medium">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Your name"
                required
                autoComplete="name"
                className="rounded-[10px] bg-secondary focus-visible:ring-primary/10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="rounded-[10px] bg-secondary focus-visible:ring-primary/10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password" className="text-[13px] font-medium">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="rounded-[10px] bg-secondary focus-visible:ring-primary/10"
              />
            </div>
            {state.error && (
              <p className="text-center text-sm text-destructive">
                {state.error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full rounded-[10px] hover:bg-[#4F46E5]"
              disabled={pending}
            >
              {pending ? "Creating account..." : "Create account"}
            </Button>
          </form>

          {/* Spots remaining */}
          {regInfo && regInfo.remaining > 0 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {regInfo.remaining}/50 spots remaining
            </p>
          )}
        </>
      )}

      {/* Navigation link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
