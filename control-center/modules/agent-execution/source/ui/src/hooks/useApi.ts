/**
 * API hook — wraps POST /api/do with auth token from URL.
 */

function getToken(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("token") ?? "";
}

export async function apiDo(body: Record<string, unknown>): Promise<any> {
  const resp = await fetch("/api/do", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });
  return resp.json();
}

export function wsUrl(sessionId: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/${sessionId}?token=${getToken()}`;
}
