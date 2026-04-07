"use client";

import { useState } from "react";

interface LoginProps {
  onLogin: (username: string, password: string) => boolean;
}

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
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
      <div className="w-full max-w-md">
        <div className="rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-semibold text-[var(--navy-dark)] mb-2">
              Kanban Studio
            </h1>
            <p className="text-[var(--gray-text)]">Sign in to access your board</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[var(--navy-dark)] mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-3 text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--navy-dark)] mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-3 text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-[var(--secondary-purple)] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[var(--gray-text)]">
            Demo credentials: user / password
          </div>
        </div>
      </div>
    </div>
  );
};