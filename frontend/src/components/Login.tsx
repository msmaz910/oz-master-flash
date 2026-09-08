"use client";

import { useState, type FormEvent } from "react";
import { BoardIcon, LogoutIcon } from "@/components/icons";
import { login, register, setAuthToken } from "@/lib/api";

type LoginProps = {
  onAuthenticated: (username: string) => void;
};

const fieldClass =
  "w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:bg-white";

export const Login = ({ onAuthenticated }: LoginProps) => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSignIn = mode === "signin";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = isSignIn
        ? await login(username, password)
        : await register(username, password);
      setAuthToken(result.token);
      onAuthenticated(result.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "signin" ? "signup" : "signin"));
    setError("");
  };

  let submitLabel = isSignIn ? "Sign In" : "Create Account";
  if (submitting) {
    submitLabel = "Please wait...";
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-[70%] -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(47,93,68,0.22)_0%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(181,83,44,0.18)_0%,_transparent_72%)]" />

      <div className="relative w-full max-w-md">
        <div className="rounded-[28px] border border-[var(--stroke)] bg-white/85 p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--primary-blue),var(--secondary-purple))] text-white shadow-[0_10px_24px_rgba(47,93,68,0.35)]">
              <BoardIcon className="h-6 w-6" />
            </span>
            <h1 className="font-display text-3xl font-semibold text-[var(--navy-dark)]">
              Kanban Studio
            </h1>
            <p className="mt-2 text-sm text-[var(--gray-text)]">
              {isSignIn
                ? "Sign in to access your boards"
                : "Create an account to get started"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gray-text)]"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className={fieldClass}
                placeholder="Enter username"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gray-text)]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClass}
                placeholder="Enter password"
                autoComplete={isSignIn ? "current-password" : "new-password"}
                minLength={isSignIn ? undefined : 6}
                required
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--secondary-purple)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogoutIcon className="h-4 w-4 rotate-180" />
              {submitLabel}
            </button>
          </form>

          <button
            type="button"
            onClick={toggleMode}
            className="mt-4 w-full text-center text-xs font-semibold text-[var(--secondary-purple)] transition hover:brightness-110"
          >
            {isSignIn
              ? "Need an account? Sign up"
              : "Already have an account? Sign in"}
          </button>

          {isSignIn && (
            <div className="mt-6 rounded-xl bg-[var(--surface)] px-3 py-2 text-center text-xs text-[var(--gray-text)]">
              Demo credentials: user / password
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
