"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { loginAction, type LoginState } from "./actions";

const initial: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="grid gap-4">
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-clay/30 bg-clay-soft px-3 py-2 text-sm text-clay"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue="britt@northminster.example"
          className="h-10 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          defaultValue="setmeister-demo"
          className="h-10 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink"
        />
      </div>

      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
