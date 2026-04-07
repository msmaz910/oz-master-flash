"use client";

import { useState, useEffect } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Login } from "@/components/Login";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in on mount
    const loggedIn = localStorage.getItem("kanban-auth") === "true";
    setIsLoggedIn(loggedIn);
  }, []);

  const handleLogin = (username: string, password: string): boolean => {
    if (username === "user" && password === "password") {
      localStorage.setItem("kanban-auth", "true");
      setIsLoggedIn(true);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    localStorage.removeItem("kanban-auth");
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return <KanbanBoard onLogout={handleLogout} />;
}
