/**
 * Sidebar — session list (push-driven) + add session form.
 *
 * Phase 3 rewrite: uses /ws/events for session list updates
 * instead of polling. Passes full session object on select.
 */
import { useState } from "react";
import { apiDo } from "../hooks/useApi";
import type { SessionInfo } from "../hooks/useEvents";

interface Props {
  sessions: SessionInfo[];
  activeSessionId: string | null;
  onSelectSession: (session: SessionInfo) => void;
}

const STATUS_COLORS: Record<string, string> = {
  ready: "var(--green)",
  busy: "var(--yellow)",
  waiting_for_input: "var(--orange)",
  error: "var(--red)",
  stopped: "var(--border)",
  exited: "var(--border)",
  starting: "var(--accent)",
};

export function Sidebar({ sessions, activeSessionId, onSelectSession }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [command, setCommand] = useState("bash");
  const [directory, setDirectory] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const data = await apiDo({
      action: "create",
      session: name.trim(),
      command: command.trim() || "bash",
      ...(directory.trim() ? { directory: directory.trim() } : {}),
      auto_start: true,
    });
    if (data.ok) {
      setName("");
      setCommand("bash");
      setDirectory("");
      setShowForm(false);
      // Session will appear via events WS push — no manual refresh
      onSelectSession({ id: data.id, name: name.trim(), status: "starting" });
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await apiDo({ action: "delete", session: id });
    // Removal will arrive via events WS push
  };

  const activeCount = sessions.filter(
    (s) => s.status === "ready" || s.status === "busy" || s.status === "starting"
  ).length;

  return (
    <div className="w-[var(--sidebar-width)] bg-[var(--bg-panel)] border-r border-[var(--border)] flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex justify-between items-center">
        <span className="font-semibold text-[var(--text-bright)] text-sm">ATerm</span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-2.5 py-1 text-xs font-semibold rounded cursor-pointer border-none"
          style={{
            background: showForm ? "var(--border)" : "var(--accent)",
            color: showForm ? "var(--text)" : "#000",
          }}
        >
          {showForm ? "Cancel" : "+ New"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="p-4 border-b border-[var(--border)] flex flex-col gap-2">
          <input
            placeholder="Session name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-bright)] px-2 py-1.5 rounded text-sm outline-none focus:border-[var(--accent)]"
          />
          <input
            placeholder="Command (default: bash)"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            className="bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-bright)] px-2 py-1.5 rounded text-sm outline-none focus:border-[var(--accent)]"
          />
          <input
            placeholder="Directory (default: server cwd)"
            value={directory}
            onChange={(e) => setDirectory(e.target.value)}
            className="bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-bright)] px-2 py-1.5 rounded text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            className="bg-[var(--accent)] text-black border-none rounded py-1.5 cursor-pointer text-sm font-semibold"
          >
            Add & Start
          </button>
        </form>
      )}

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-2">
        {sessions.length === 0 && (
          <div className="p-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            No sessions. Click + New to create one.
          </div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelectSession(s)}
            className="px-4 py-2 cursor-pointer flex items-center gap-2 transition-colors duration-150"
            style={{
              background: activeSessionId === s.id ? "var(--bg-input)" : undefined,
              borderLeft: activeSessionId === s.id ? "2px solid var(--accent)" : "2px solid transparent",
            }}
            onMouseEnter={(e) => {
              if (activeSessionId !== s.id) (e.currentTarget as HTMLElement).style.background = "var(--bg-header)";
            }}
            onMouseLeave={(e) => {
              if (activeSessionId !== s.id) (e.currentTarget as HTMLElement).style.background = "";
            }}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: STATUS_COLORS[s.status] ?? "var(--border)" }}
            />
            <div className="flex-1 overflow-hidden">
              <div className="text-sm text-[var(--text-bright)] whitespace-nowrap overflow-hidden text-ellipsis">
                {s.label ?? s.name}
              </div>
              {s.tags && s.tags.length > 0 && (
                <div className="text-[0.7rem]" style={{ color: "var(--text-muted)" }}>{s.tags.join(", ")}</div>
              )}
            </div>
            <button
              onClick={(e) => handleDelete(s.id, e)}
              className="bg-transparent border-none text-[var(--text)] cursor-pointer opacity-30 text-xs px-1 hover:opacity-100 hover:text-[var(--red)]"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[var(--border)] text-[0.7rem] flex justify-between" style={{ color: "var(--text-muted)" }}>
        <span>ATerm v0.1.0</span>
        <span>{activeCount} active</span>
      </div>
    </div>
  );
}
