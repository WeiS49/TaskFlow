"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, {
    error: null,
  });

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
          Sign in to your account
        </p>
      </div>

      {/* Form */}
      <form action={formAction} className="grid gap-[18px]">
        <div className="grid gap-1.5">
          <Label htmlFor="email" className="text-[13px] font-medium">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="admin@example.com"
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
            autoComplete="current-password"
            className="rounded-[10px] bg-secondary focus-visible:ring-primary/10"
          />
        </div>
        {state.error && (
          <p className="text-sm text-destructive text-center">{state.error}</p>
        )}
        <Button
          type="submit"
          className="w-full rounded-[10px] hover:bg-[#4F46E5]"
          disabled={pending}
        >
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      {/* Sign up link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
