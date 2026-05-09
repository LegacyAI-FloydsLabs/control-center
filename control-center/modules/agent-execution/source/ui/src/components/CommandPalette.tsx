/**
 * Command Palette — Ctrl+K searchable command surface.
 *
 * This is how I navigate. Every action, every session, every command
 * reachable by typing a few characters. No mouse required.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { apiDo } from "../hooks/useApi";
import type { SessionInfo } from "../hooks/useEvents";

interface Command {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

interface Props {
  sessions: SessionInfo[];
  activeSessionId: string | null;
  onSelectSession: (session: SessionInfo) => void;
  onToggleSidebar: () => void;
  onSetLayout: (layout: string) => void;
}

export function CommandPalette({
  sessions,
  activeSessionId,
  onSelectSession,
  onToggleSidebar,
  onSetLayout,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    // Session switching
    ...sessions.map((s, i) => ({
      id: `session-${s.id}`,
      label: `Switch to: ${s.label ?? s.name}`,
      category: "Sessions",
      shortcut: i < 9 ? `Ctrl+${i + 1}` : undefined,
      action: () => onSelectSession(s),
    })),

    // Session actions
    ...(activeSessionId
      ? [
          {
            id: "stop-session",
            label: "Stop current session",
            category: "Session Actions",
            action: () => apiDo({ action: "stop", session: activeSessionId }),
          },
          {
            id: "restart-session",
            label: "Restart current session",
            category: "Session Actions",
            action: async () => {
              await apiDo({ action: "stop", session: activeSessionId });
              setTimeout(() => apiDo({ action: "start", session: activeSessionId }), 500);
            },
          },
          {
            id: "cancel-session",
            label: "Send Ctrl+C to current session",
            category: "Session Actions",
            action: () => apiDo({ action: "cancel", session: activeSessionId }),
          },
          {
            id: "checkpoint-session",
            label: "Save checkpoint",
            category: "Session Actions",
            action: () => apiDo({ action: "checkpoint", session: activeSessionId }),
          },
        ]
      : []),

    // Layout commands
    { id: "layout-auto", label: "Layout: Auto Grid", category: "Layout", action: () => onSetLayout("auto") },
    { id: "layout-2x1", label: "Layout: 2 columns", category: "Layout", action: () => onSetLayout("2x1") },
    { id: "layout-3x1", label: "Layout: 3 columns", category: "Layout", action: () => onSetLayout("3x1") },
    { id: "layout-2x2", label: "Layout: 2x2 grid", category: "Layout", action: () => onSetLayout("2x2") },
    { id: "layout-tabs", label: "Layout: Tabs", category: "Layout", action: () => onSetLayout("tabs") },
    { id: "layout-single", label: "Layout: Single", category: "Layout", action: () => onSetLayout("single") },

    // UI commands
    {
      id: "toggle-sidebar",
      label: "Toggle sidebar",
      category: "UI",
      shortcut: "Ctrl+B",
      action: onToggleSidebar,
    },
    {
      id: "new-session",
      label: "New session (bash)",
      category: "Session Actions",
      action: async () => {
        const name = `shell-${Date.now().toString(36)}`;
        const data = await apiDo({
          action: "create",
          session: name,
          command: "bash",
          auto_start: true,
        });
        if (data.ok) onSelectSession({ id: data.id, name, status: "starting" });
      },
    },
  ];

  // Filter commands by query
  const filtered = query.trim()
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  // Group by category
  const grouped = new Map<string, Command[]>();
  for (const cmd of filtered) {
    const list = grouped.get(cmd.category) ?? [];
    list.push(cmd);
    grouped.set(cmd.category, list);
  }

  const flatFiltered = filtered;

  // Execute selected command
  const execute = useCallback(
    (cmd: Command) => {
      cmd.action();
      setOpen(false);
      setQuery("");
      setSelectedIndex(0);
    },
    []
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K — open palette
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
        return;
      }

      // Ctrl+B — toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === "b" && !e.shiftKey) {
        // Only when not typing in terminal
        if (document.activeElement?.closest(".xterm")) return;
        e.preventDefault();
        onToggleSidebar();
        return;
      }

      // Ctrl+1-9 — switch to session by index
      if ((e.ctrlKey || e.metaKey) && e.key >= "1" && e.key <= "9") {
        const idx = parseInt(e.key) - 1;
        if (idx < sessions.length) {
          e.preventDefault();
          onSelectSession(sessions[idx]!);
        }
        return;
      }

      // Ctrl+Tab — cycle sessions
      if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        if (sessions.length === 0) return;
        const currentIdx = sessions.findIndex((s) => s.id === activeSessionId);
        const nextIdx = (currentIdx + 1) % sessions.length;
        onSelectSession(sessions[nextIdx]!);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sessions, activeSessionId, onSelectSession, onToggleSidebar]);

  // Palette keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (flatFiltered[selectedIndex]) {
          execute(flatFiltered[selectedIndex]);
        }
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flatFiltered, selectedIndex, execute]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[20000] flex items-start justify-center pt-[15vh]"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-[520px] max-h-[460px] flex flex-col overflow-hidden rounded-lg border border-[var(--border)]"
        style={{ background: "var(--bg-panel)", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command..."
          className="w-full px-4 py-3.5 text-base outline-none border-none border-b border-[var(--border)]"
          style={{
            background: "transparent",
            color: "var(--text-bright)",
            borderBottom: "1px solid var(--border)",
          }}
        />
        <div className="overflow-y-auto max-h-[360px]">
          {flatFiltered.length === 0 && (
            <div className="px-4 py-5 text-center text-sm opacity-50" style={{ color: "var(--text)" }}>
              No matching commands
            </div>
          )}
          {[...grouped.entries()].map(([category, cmds]) => (
            <div key={category}>
              <div
                className="px-4 py-1.5 text-[0.65rem] uppercase tracking-wider sticky top-0 z-[1]"
                style={{ color: "var(--accent)", opacity: 0.7, background: "var(--bg-panel)" }}
              >
                {category}
              </div>
              {cmds.map((cmd) => {
                const globalIdx = flatFiltered.indexOf(cmd);
                return (
                  <div
                    key={cmd.id}
                    onClick={() => execute(cmd)}
                    className="px-4 py-2 cursor-pointer text-sm flex justify-between items-center gap-2"
                    style={{
                      color: globalIdx === selectedIndex ? "var(--text-bright)" : "var(--text)",
                      background: globalIdx === selectedIndex ? "var(--bg-input)" : undefined,
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                  >
                    <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                      {cmd.label}
                    </span>
                    {cmd.shortcut && (
                      <span
                        className="text-[0.7rem] shrink-0 px-1.5 py-0.5 rounded"
                        style={{ opacity: 0.5, background: "var(--bg-input)" }}
                      >
                        {cmd.shortcut}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
