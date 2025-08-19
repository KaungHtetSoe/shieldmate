const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export type Mode = "phishng" | "wifisec" | "cybersec";
export async function ask(topic: Mode, q: string, signal?: AbortSignal) {
  const res = await fetch(`${BASE}/ask/${topic}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q }),
    signal,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<{ answer: string }>;
}
