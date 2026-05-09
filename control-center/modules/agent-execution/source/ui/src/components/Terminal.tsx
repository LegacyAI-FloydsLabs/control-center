/**
 * Terminal component — xterm.js v6 + WebSocket with auto-reconnect.
 *
 * Phase 3: Added auto-reconnect with exponential backoff (1s→2s→4s→max 30s).
 * Shows [reconnecting...] during reconnection attempts.
 * Satisfies BLUEPRINT invariant 7: "WebSocket connections survive server restart."
 */
import { useEffect, useRef, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { wsUrl } from "../hooks/useApi";

interface Props {
  sessionId: string;
  onStateChange?: (state: any) => void;
}

export function Terminal({ sessionId, onStateChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const disposedRef = useRef(false);
  const termRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const attemptsRef = useRef(0);

  const connectWs = useCallback((term: XTerm) => {
    if (disposedRef.current) return;

    const url = wsUrl(sessionId);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptsRef.current = 0;
    };

    ws.onmessage = (e) => {
      if (disposedRef.current) return;
      try {
        const msg = JSON.parse(e.data);
        switch (msg.type) {
          case "scrollback":
          case "data":
            term.write(msg.payload);
            break;
          case "state":
            onStateChange?.(msg);
            break;
        }
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      if (disposedRef.current) return;
      wsRef.current = null;

      // Auto-reconnect with backoff
      const delay = Math.min(1000 * Math.pow(2, attemptsRef.current), 30000);
      attemptsRef.current++;

      term.write(`\r\n\x1b[33m[reconnecting in ${Math.round(delay / 1000)}s...]\x1b[0m`);

      reconnectTimer.current = setTimeout(() => {
        if (!disposedRef.current) {
          term.write(`\r\n\x1b[33m[connecting...]\x1b[0m\r\n`);
          connectWs(term);
        }
      }, delay);
    };

    ws.onerror = () => {
      ws.close();
    };

    // Terminal input → WebSocket
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", payload: data }));
      }
    });
  }, [sessionId, onStateChange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    disposedRef.current = false;
    attemptsRef.current = 0;

    // Create xterm
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace",
      theme: {
        background: "#1e1e1e",
        foreground: "#cccccc",
        cursor: "#6cb2f7",
        selectionBackground: "#264f78",
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(webLinksAddon);
    term.open(el);

    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => webglAddon.dispose());
      term.loadAddon(webglAddon);
    } catch { /* WebGL not available */ }

    fitAddon.fit();
    termRef.current = term;

    // Resize observer
    const observer = new ResizeObserver(() => {
      if (disposedRef.current) return;
      fitAddon.fit();
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      }
    });
    observer.observe(el);

    // Connect WebSocket
    connectWs(term);

    // Cleanup
    return () => {
      disposedRef.current = true;
      clearTimeout(reconnectTimer.current);
      observer.disconnect();
      wsRef.current?.close();
      term.dispose();
      termRef.current = null;
    };
  }, [sessionId, connectWs]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: "#1e1e1e" }}
    />
  );
}
