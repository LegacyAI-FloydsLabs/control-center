/**
 * Output Marks Panel — gutter showing numbered output marks.
 *
 * This is how I point at things. Instead of describing "the error around line 42,"
 * I reference "mark 3" and both the human and I know exactly what we mean.
 */
import { useState, useEffect, useCallback } from "react";
import { apiDo } from "../hooks/useApi";

interface Mark {
  id: number;
  ref: string;
  type: "command" | "output" | "error" | "prompt";
  text: string;
  lines: number;
}

interface Props {
  sessionId: string;
  visible: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  command: "var(--accent)",
  output: "var(--text)",
  error: "var(--red)",
  prompt: "var(--green)",
};

const TYPE_ICONS: Record<string, string> = {
  command: "$",
  output: "~",
  error: "!",
  prompt: ">",
};

export function MarksPanel({ sessionId, visible }: Props) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  const refreshMarks = useCallback(async () => {
    if (!visible) return;
    const data = await apiDo({
      action: "read",
      session: sessionId,
      include_marks: true,
    });
    if (data.ok && data.marks) {
      setMarks(data.marks);
    }
  }, [sessionId, visible]);

  useEffect(() => {
    refreshMarks();
    const interval = setInterval(refreshMarks, 3000);
    return () => clearInterval(interval);
  }, [refreshMarks]);

  if (!visible || marks.length === 0) return null;

  return (
    <div
      className="w-48 shrink-0 overflow-y-auto border-l border-[var(--border)]"
      style={{ background: "var(--bg-panel)" }}
    >
      <div
        className="px-3 py-2 text-[0.7rem] uppercase tracking-wider border-b border-[var(--border)]"
        style={{ color: "var(--accent)", opacity: 0.7 }}
      >
        Output Marks ({marks.length})
      </div>

      {marks.map((m) => (
        <div
          key={m.id}
          className="px-2 py-1.5 cursor-pointer border-b border-[var(--border)] transition-colors"
          style={{
            background: expanded === m.id ? "var(--bg-input)" : undefined,
            borderLeft: `3px solid ${TYPE_COLORS[m.type] ?? "var(--border)"}`,
          }}
          onClick={() => setExpanded(expanded === m.id ? null : m.id)}
          title={m.text.slice(0, 200)}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="text-[0.7rem] font-mono font-bold w-5 text-center"
              style={{ color: TYPE_COLORS[m.type] }}
            >
              {m.id}
            </span>
            <span
              className="text-[0.65rem] font-mono"
              style={{ color: TYPE_COLORS[m.type], opacity: 0.6 }}
            >
              {TYPE_ICONS[m.type]}
            </span>
            <span
              className="text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
              style={{ color: "var(--text)" }}
            >
              {m.text.split("\n")[0]?.slice(0, 40)}
            </span>
            <span className="text-[0.6rem] opacity-30">{m.lines}L</span>
          </div>

          {/* Expanded content */}
          {expanded === m.id && (
            <pre
              className="mt-1.5 text-[0.7rem] leading-tight overflow-x-auto max-h-32 overflow-y-auto p-1.5 rounded"
              style={{
                color: "var(--text)",
                background: "var(--bg)",
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {m.text.slice(0, 500)}
              {m.text.length > 500 && "\n..."}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
