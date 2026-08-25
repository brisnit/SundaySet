import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

/**
 * Auth.js redirects here with `?error=` when it rejects a sign-in. Surfacing
 * those in plain language matters: the underlying failures are opaque, and a
 * Configuration error in particular otherwise shows up as raw JSON.
 */
const ERRORS: Record<string, string> = {
  Configuration:
    "Sign-in was blocked by a stale browser cookie. It has been cleared — please try again.",
  CredentialsSignin: "That email and password don't match an account.",
  AccessDenied: "That account doesn't have access to a church yet.",
  Verification: "That sign-in link has expired. Request a new one.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const key = Array.isArray(params.error) ? params.error[0] : params.error;
  const error = key ? (ERRORS[key] ?? "Something went wrong signing in.") : undefined;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl tracking-tight text-ink">
            SetMeister
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Build the set. Schedule the team. Get Sunday ready.
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-clay/30 bg-clay-soft px-3 py-2 text-sm text-clay"
          >
            {error}
          </p>
        ) : null}

        <LoginForm />

        <p className="mt-6 rounded-lg bg-sunken px-3 py-2.5 text-center text-xs leading-relaxed text-ink-muted">
          Demo account is pre-filled.
          <br />
          <span className="text-ink-subtle">
            britt@northminster.example — owner
          </span>
        </p>
      </div>
    </div>
  );
}
