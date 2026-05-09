/**
 * ATerm App — Floyd's terminal.
 *
 * Command palette (Ctrl+K), keyboard navigation (Ctrl+1-9, Ctrl+Tab),
 * grid/tab/split layouts, push-driven session list.
 */
import { useState, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { Terminal } from "./components/Terminal";
import { StatusBar } from "./components/StatusBar";
import { CommandPalette } from "./components/CommandPalette";
import { MarksPanel } from "./components/MarksPanel";
import { useEvents, type SessionInfo } from "./hooks/useEvents";

interface StateInfo {
  state: string;
  confidence: number;
  method: string;
  detail: string;
}

type Layout = "single" | "tabs" | "auto" | "2x1" | "3x1" | "2x2";

export function App() {
  const { sessions, connected } = useEvents();
  const [activeSession, setActiveSession] = useState<SessionInfo | null>(null);
  const [stateInfo, setStateInfo] = useState<StateInfo | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [layout, setLayout] = useState<Layout>("single");
  const [marksVisible, setMarksVisible] = useState(false);

  const handleSelectSession = useCallback((session: SessionInfo) => {
    setActiveSession(session);
    setStateInfo(null);
  }, []);

  const handleStateChange = useCallback((msg: any) => {
    setStateInfo({
      state: msg.state,
      confidence: msg.confidence,
      method: msg.method,
      detail: msg.detail,
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarVisible((v) => !v);
  }, []);

  // Keep active session status in sync with events
  const activeStatus = activeSession
    ? sessions.find((s) => s.id === activeSession.id)?.status ?? stateInfo?.state ?? activeSession.status
    : null;

  // Determine which sessions to show in grid view
  const gridSessions = layout === "single"
    ? (activeSession ? [activeSession] : [])
    : sessions.filter((s) => s.status !== "stopped" && s.status !== "exited");

  const gridClass = {
    single: "grid-cols-1",
    tabs: "grid-cols-1",
    auto: "grid-cols-[repeat(auto-fill,minmax(480px,1fr))]",
    "2x1": "grid-cols-2",
    "3x1": "grid-cols-3",
    "2x2": "grid-cols-2",
  }[layout];

  return (
    <div className="flex flex-col h-screen w-screen" role="application" aria-label="ATerm terminal emulator">
      {/* Command Palette */}
      <CommandPalette
        sessions={sessions}
        activeSessionId={activeSession?.id ?? null}
        onSelectSession={handleSelectSession}
        onToggleSidebar={toggleSidebar}
        onSetLayout={(l) => setLayout(l as Layout)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarVisible && (
          <Sidebar
            sessions={sessions}
            activeSessionId={activeSession?.id ?? null}
            onSelectSession={handleSelectSession}
          />
        )}

        {/* Main area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 shrink-0 border-b border-[var(--border)]"
            style={{ background: "var(--bg-panel)" }}
          >
            <button
              onClick={toggleSidebar}
              className="bg-transparent border-none cursor-pointer text-sm min-w-[24px] min-h-[24px] p-2 rounded"
              style={{ color: "var(--text)" }}
              title="Toggle sidebar (Ctrl+B)"
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
            <span className="text-sm font-semibold" style={{ color: "var(--text-bright)" }}>
              Terminals
            </span>
            <span className="flex-1" />

            {/* Layout selector */}
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value as Layout)}
              className="text-xs px-2 py-1 rounded cursor-pointer border border-[var(--border)]"
              style={{ background: "var(--bg-input)", color: "var(--text)" }}
              aria-label="Select terminal layout"
            >
              <option value="single">Single</option>
              <option value="auto">Auto Grid</option>
              <option value="2x1">2 columns</option>
              <option value="3x1">3 columns</option>
              <option value="2x2">2x2 Grid</option>
              <option value="tabs">Tabs</option>
            </select>

            {/* Palette button */}
            <button
              onClick={() => setMarksVisible((v) => !v)}
              className="bg-transparent border-none cursor-pointer text-xs px-2 py-1 rounded"
              style={{
                color: marksVisible ? "var(--accent)" : "var(--text)",
                background: marksVisible ? "var(--bg-input)" : undefined,
              }}
              title="Toggle output marks panel"
            >
              Marks
            </button>
            <button
              onClick={() => {
                // Trigger Ctrl+K programmatically
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
              }}
              className="bg-transparent border-none cursor-pointer text-xs px-2 py-1 rounded"
              style={{ color: "var(--text)", background: "var(--bg-input)" }}
              title="Command Palette (Ctrl+K)"
            >
              ⌘K
            </button>
          </div>

          {/* Tab bar (when in tabs mode) */}
          {layout === "tabs" && sessions.length > 0 && (
            <div
              className="flex overflow-x-auto shrink-0 border-b border-[var(--border)] px-2"
              style={{ background: "var(--bg-panel)" }}
            >
              {sessions
                .filter((s) => s.status !== "stopped")
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSession(s)}
                    className="px-4 py-2 cursor-pointer text-sm whitespace-nowrap border-none bg-transparent"
                    style={{
                      color: activeSession?.id === s.id ? "var(--text-bright)" : "var(--text)",
                      borderBottom: activeSession?.id === s.id ? "2px solid var(--accent)" : "2px solid transparent",
                    }}
                  >
                    {s.label ?? s.name}
                  </button>
                ))}
            </div>
          )}

          {/* Terminal grid */}
          {gridSessions.length > 0 ? (
            <div className={`flex-1 overflow-auto p-4 grid ${gridClass} gap-4 content-start`}>
              {(layout === "single" || layout === "tabs"
                ? (activeSession ? [activeSession] : [])
                : gridSessions
              ).map((s) => (
                <div
                  key={s.id}
                  className="rounded-md border overflow-hidden flex flex-col"
                  style={{
                    background: "var(--bg-panel)",
                    borderColor: activeSession?.id === s.id ? "var(--accent)" : "var(--border)",
                    minHeight: layout === "single" || layout === "tabs" ? "calc(100vh - 120px)" : "300px",
                    height: layout === "2x2" ? "calc(50vh - 80px)" : undefined,
                  }}
                  onClick={() => handleSelectSession(s)}
                >
                  {/* Frame header */}
                  <div
                    className="flex items-center gap-2 px-2.5 py-1.5 shrink-0 border-b border-[var(--border)]"
                    style={{ background: "var(--bg-header)" }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        background:
                          s.status === "ready" ? "var(--green)"
                          : s.status === "busy" ? "var(--yellow)"
                          : s.status === "error" ? "var(--red)"
                          : s.status === "waiting_for_input" ? "var(--orange)"
                          : "var(--border)",
                      }}
                    />
                    <span className="text-sm font-semibold flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                      style={{ color: "var(--text-bright)" }}
                    >
                      {s.label ?? s.name}
                    </span>
                    <span className="text-[0.65rem]" style={{ color: "var(--text-muted)" }}>{s.status}</span>
                  </div>

                  {/* Terminal + Marks */}
                  <div className="flex-1 overflow-hidden flex">
                    <div className="flex-1 overflow-hidden">
                      <Terminal
                        sessionId={s.id}
                        onStateChange={activeSession?.id === s.id ? handleStateChange : undefined}
                      />
                    </div>
                    {marksVisible && activeSession?.id === s.id && (
                      <MarksPanel sessionId={s.id} visible={marksVisible} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col gap-3" style={{ color: "var(--text-muted)" }}>
              <div className="text-3xl">$_</div>
              <div className="text-sm">Select a session or create a new one</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                Ctrl+K command palette &middot; Ctrl+1-9 switch sessions
              </div>
            </div>
          )}
        </main>
      </div>

      <StatusBar
        connected={connected}
        sessionName={activeSession?.name ?? null}
        sessionStatus={activeStatus ?? null}
        stateConfidence={stateInfo?.confidence ?? null}
        stateMethod={stateInfo?.method ?? null}
      />
    </div>
  );
}
