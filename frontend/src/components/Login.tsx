"use client";

import { useState } from "react";
import { BoardIcon, LogoutIcon } from "@/components/icons";

interface LoginProps {
  onLogin: (username: string, password: string) => boolean;
}

const fieldClass =
  "w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:bg-white";

export const Login = ({ onLogin }: LoginProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogin(username, password)) {
      setError("");
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-[70%] -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.22)_0%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_transparent_72%)]" />

      <div className="relative w-full max-w-md">
        <div className="rounded-[28px] border border-[var(--stroke)] bg-white/85 p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--primary-blue),var(--secondary-purple))] text-white shadow-[0_10px_24px_rgba(32,157,215,0.35)]">
              <BoardIcon className="h-6 w-6" />
            </span>
            <h1 className="font-display text-3xl font-semibold text-[var(--navy-dark)]">
              Kanban Studio
            </h1>
            <p className="mt-2 text-sm text-[var(--gray-text)]">
              Sign in to access your board
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
                onChange={(e) => setUsername(e.target.value)}
                className={fieldClass}
                placeholder="Enter username"
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
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClass}
                placeholder="Enter password"
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--secondary-purple)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <LogoutIcon className="h-4 w-4 rotate-180" />
              Sign In
            </button>
          </form>

          <div className="mt-6 rounded-xl bg-[var(--surface)] px-3 py-2 text-center text-xs text-[var(--gray-text)]">
            Demo credentials: user / password
          </div>
        </div>
      </div>
    </div>
  );
};
