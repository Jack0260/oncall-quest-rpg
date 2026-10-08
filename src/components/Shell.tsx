import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem("oncall-theme");
    if (saved) setDark(saved === "dark");
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("oncall-theme", dark ? "dark" : "light");
  }, [dark]);
  return (
    <div className="crt min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-sm">
          <Link to="/" className="font-bold text-primary">
            ~/oncall-rpg<span className="blink">_</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/" className="hover:text-accent">[scenarios]</Link>
            <Link to="/leaderboard" className="hover:text-accent">[leaderboard]</Link>
            <button onClick={() => setDark(!dark)} className="hover:text-accent">
              [{dark ? "light" : "dark"}]
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
