"use client";

import { useState, useEffect } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Login } from "@/components/Login";
import { clearAuthToken, fetchCurrentUser, getAuthToken, logout } from "@/lib/api";

type AuthState = "checking" | "authenticated" | "unauthenticated";

export default function Home() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      if (!getAuthToken()) {
        setAuthState("unauthenticated");
        return;
      }
      try {
        const me = await fetchCurrentUser();
        setUsername(me.username);
        setAuthState("authenticated");
      } catch {
        clearAuthToken();
        setAuthState("unauthenticated");
      }
    };
    checkSession();
  }, []);

  const handleAuthenticated = (name: string) => {
    setUsername(name);
    setAuthState("authenticated");
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuthToken();
      setUsername(null);
      setAuthState("unauthenticated");
    }
  };

  if (authState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary-blue)] border-t-transparent" />
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return <Login onAuthenticated={handleAuthenticated} />;
  }

  return <KanbanBoard username={username} onLogout={handleLogout} />;
}
