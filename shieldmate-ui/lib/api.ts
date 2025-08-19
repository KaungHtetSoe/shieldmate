// const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// export type Mode = "phishng" | "wifisec" | "cybersec" | "emailbreached";
// export async function ask(topic: Mode, q: string, signal?: AbortSignal) {
//   const res = await fetch(`${BASE}/ask/${topic}`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ q }),
//     signal,
//   });
//   if (!res.ok) {
//     throw new Error(`HTTP ${res.status} ${res.statusText}`);
//   }
//   return res.json() as Promise<{ answer: string }>;
// }


// src/lib/api.ts
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export type Mode = "phishng" | "wifisec" | "cybersec" | "emailbreached";

export type AskResponse = {
  answer: string;
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

export type EmailBreach = {
  Name: string;
  Title: string;
  Domain: string | null;
  BreachDate: string;
  AddedDate: string;
  PwnCount: number;
  DataClasses: string[];
  IsVerified: boolean;
  IsSensitive: boolean;
  LogoPath?: string;
};

export type EmailCheckResponse = {
  email: string;
  count: number;
  breaches: EmailBreach[];
  ai_summary?: string;   // present only when with_ai=true
  ai_error?: string;     // if AI failed
};

type EmailCheckOpts = {
  withAI?: boolean;
  includeUnverified?: boolean;
  truncate?: boolean;
  domain?: string | null;
};

export async function ask(
  topic: Mode,
  q: string,
  signal?: AbortSignal,
  opts?: EmailCheckOpts
): Promise<AskResponse | EmailCheckResponse> {
  // New: map emailbreached -> /ask/emailcheck (sends {question,...})
  if (topic === "emailbreached") {
    const res = await fetch(`${BASE}/ask/emailbreached`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: q,
        email: null,
        // with_ai: !!opts?.withAI,
        with_ai: true,
        include_unverified: !!opts?.includeUnverified,
        truncate: !!opts?.truncate,
        domain: opts?.domain ?? null,
      }),
      signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return (await res.json()) as EmailCheckResponse;
  }

  // Existing AI routes
  const res = await fetch(`${BASE}/ask/${topic}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q }),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return (await res.json()) as AskResponse;
}
