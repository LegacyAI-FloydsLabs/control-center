/**
 * Status bar — connection state, active session info, state detection display, theme toggle.
 */
import { useState, useEffect } from "react";

interface Props {
  connected: boolean;
  sessionName: string | null;
  sessionStatus: string | null;
  stateConfidence: number | null;
  stateMethod: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  ready: "Ready",
  busy: "Busy",
  waiting_for_input: "Waiting for input",
  error: "Error",
  stopped: "Stopped",
  exited: "Exited",
  starting: "Starting",
};

function getTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem("aterm-theme") as "dark" | "light") ?? "dark";
}

function applyTheme(theme: "dark" | "light"): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("aterm-theme", theme);
}

export function StatusBar({ connected, sessionName, sessionStatus, stateConfidence, stateMethod }: Props) {
  const [theme, setTheme] = useState<"dark" | "light">(getTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <div className="h-6 bg-[var(--bg-panel)] border-t border-[var(--border)] flex items-center px-3 gap-3 text-xs text-[var(--text)] shrink-0">
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: connected ? "var(--green)" : "var(--red)" }}
      />
      <span>{connected ? "Connected" : "Disconnected"}</span>

      <span className="opacity-30">|</span>

      {sessionName ? (
        <>
          <span className="text-[var(--text-bright)]">{sessionName}</span>
          <span className="opacity-70">
            {STATUS_LABELS[sessionStatus ?? ""] ?? sessionStatus ?? "unknown"}
          </span>
          {stateConfidence !== null && (
            <span className="opacity-40">
              {Math.round(stateConfidence * 100)}% via {stateMethod}
            </span>
          )}
        </>
      ) : (
        <span className="opacity-50">No session selected</span>
      )}

      <span className="flex-1" />
      <button
        onClick={toggleTheme}
        className="bg-transparent border border-[var(--border)] rounded px-1.5 py-0.5 cursor-pointer text-[10px]"
        style={{ color: "var(--text-muted)" }}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      >
        {theme === "dark" ? "Light" : "Dark"}
      </button>
      <span className="opacity-40">ATerm v0.1.0 — port 9600</span>
    </div>
  );
}
