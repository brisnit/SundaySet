import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
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
