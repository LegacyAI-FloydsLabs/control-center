/**
 * Global events WebSocket hook.
 *
 * Replaces sidebar polling with push notifications.
 * Connects to /ws/events, receives session lifecycle events.
 * Fulfills the project thesis: "terminal notifies agent, not agent polls terminal."
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { wsUrl } from "./useApi";

export interface SessionInfo {
  id: string;
  name: string;
  label?: string | null;
  status: string;
  tags?: string[];
  pid?: number | null;
}

/** Returns live session list, updated via push events. */
export function useEvents() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const attemptsRef = useRef(0);

  const connect = useCallback(() => {
    // Build events URL — reuse wsUrl helper but swap session for "events"
    const url = wsUrl("events");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      attemptsRef.current = 0;
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        switch (msg.type) {
          case "sessions_list":
            setSessions(msg.sessions);
            break;

          case "session_created":
            setSessions((prev) => {
              if (prev.find((s) => s.id === msg.session.id)) return prev;
              return [...prev, msg.session];
            });
            break;

          case "session_deleted":
            setSessions((prev) => prev.filter((s) => s.id !== msg.sessionId));
            break;

          case "session_state":
            setSessions((prev) =>
              prev.map((s) =>
                s.id === msg.session.id
                  ? { ...s, status: msg.session.status, pid: msg.session.pid }
                  : s
              )
            );
            break;

          case "session_started":
            setSessions((prev) =>
              prev.map((s) =>
                s.id === msg.session.id
                  ? { ...s, status: msg.session.status ?? "starting", pid: msg.session.pid }
                  : s
              )
            );
            break;

          case "session_stopped":
            setSessions((prev) =>
              prev.map((s) =>
                s.id === msg.session.id
                  ? { ...s, status: msg.session.status ?? "exited", pid: null }
                  : s
              )
            );
            break;
        }
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Auto-reconnect with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attemptsRef.current), 30000);
      attemptsRef.current++;
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { sessions, connected };
}
