// "use client";

// import { useEffect, useMemo, useRef, useState } from "react";
// import {
//   getActiveChatId, newChat, loadSession, setSessionMode,
//   appendMessage, renameChat, onActiveChange, type Mode, type Message
// } from "@/lib/storage";
// import { ask } from "@/lib/api";

// const MODES: { key: Mode; label: string; hint: string }[] = [
//   { key: "phishng", label: "Phishing Check", hint: "Analyze emails/text/links" },
//   { key: "wifisec", label: "Wi-Fi Security", hint: "Harden router & network" },
//   { key: "cybersec", label: "General Security", hint: "Cyber hygiene & triage" },
// ];

// export default function Page() {
//   const [chatId, setChatId] = useState("");
//   const [mode, setMode] = useState<Mode | undefined>(undefined);
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [showPicker, setShowPicker] = useState(false);
//   const [input, setInput] = useState("");
//   const [loading, setLoading] = useState(false);
//   const abortRef = useRef<AbortController | null>(null);

//   const scrollRef = useRef<HTMLDivElement | null>(null);

//   // Initial load
//   useEffect(() => {
//     let id = getActiveChatId();
//     if (!id) id = newChat().id;
//     setChatId(id);
//     const s = loadSession(id);
//     setMode(s.mode);
//     setMessages(s.messages);
//   }, []);

//   // React to sidebar chat selection
//   useEffect(() => {
//     const unsub = onActiveChange((id) => {
//       let nextId = id || newChat().id;
//       setChatId(nextId);
//       const s = loadSession(nextId);
//       setMode(s.mode);
//       setMessages(s.messages);
//       // scroll to bottom when switching chats
//       requestAnimationFrame(() => {
//         if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
//       });
//     });
//     return unsub;
//   }, []);

//   // Auto-scroll when new messages arrive
//   useEffect(() => {
//     if (scrollRef.current) {
//       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
//     }
//   }, [messages.length]);

//   function labelFor(m?: Mode) {
//     return MODES.find(x => x.key === m)?.label || "New chat";
//   }

//   function choose(m: Mode) {
//     if (!chatId) return;
//     setSessionMode(chatId, m);
//     setMode(m);
//     renameChat(chatId, labelFor(m));
//     setShowPicker(false);
//   }

//   async function onSend(e: React.FormEvent) {
//     e.preventDefault();
//     if (!chatId) return;
//     if (!mode) { setShowPicker(true); return; }
//     const text = input.trim();
//     if (!text) return;

//     const u: Message = { id: crypto.randomUUID(), role: "user", content: text, ts: Date.now() };
//     setMessages(prev => [...prev, u]);
//     appendMessage(chatId, u);
//     setInput("");
//     setLoading(true);
//     abortRef.current?.abort();
//     abortRef.current = new AbortController();

//     try {
//       const data = await ask(mode, text, abortRef.current.signal);
//       const a: Message = { id: crypto.randomUUID(), role: "assistant", content: data.answer || "(no answer)", ts: Date.now() };
//       setMessages(prev => [...prev, a]);
//       appendMessage(chatId, a);
//     } catch (err: any) {
//       const a: Message = { id: crypto.randomUUID(), role: "assistant", content: `⚠️ ${err?.message || "Request failed"}`, ts: Date.now() };
//       setMessages(prev => [...prev, a]);
//       appendMessage(chatId, a);
//     } finally {
//       setLoading(false);
//     }
//   }

//   const lockedNote = useMemo(
//     () => (mode ? `This chat is locked to “${labelFor(mode)}”. Create a new chat to use another function.` : ""),
//     [mode]
//   );

//   return (
//     <section style={{ display: "contents" }}>
//       <h1>Chat</h1>
//       <p className="note">{lockedNote}</p>

//       {!mode && (
//         <div style={{ margin: "12px 0" }}>
//           <button className="btn primary" onClick={() => setShowPicker(v => !v)}>Start chat</button>
//         </div>
//       )}

//       {showPicker && !mode && (
//         <div className="fn-grid" role="listbox" aria-label="Choose function">
//           {MODES.map(m => (
//             <button key={m.key} className="fn" onClick={() => choose(m.key)}>
//               <strong>{m.label}</strong>
//               <div className="note">{m.hint}</div>
//             </button>
//           ))}
//         </div>
//       )}

//       {/* Scrollable messages area */}
//       <div ref={scrollRef} className="chat-scroll">
//         <div className="chat" style={{ marginTop: 12 }}>
//           {messages.map(msg => (
//             <div key={msg.id} className={`msg ${msg.role}`}>
//               {msg.content}
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Sticky bottom composer */}
//       <div className="composer">
//         <form onSubmit={onSend} className="chatbar">
//           <input
//             className="input p-1"
//             placeholder={mode ? "Type your message…" : "Pick a function to begin…"}
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             disabled={!mode || loading}
//           />
//           <button className="btn primary" disabled={loading}>
//             {loading ? "Sending…" : "Send"}
//           </button>
//         </form>
//       </div>
//     </section>
//   );
// }

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getActiveChatId, newChat, loadSession, setSessionMode,
  appendMessage, renameChat, onActiveChange, type Mode, type Message
} from "@/lib/storage";
import { ask } from "@/lib/api";
import { uuid } from "@/lib/uuid";
import EmailCheckResult from "@/components/EmailCheckResponse";

// add near top of src/app/page.tsx (or a utils file)
type EmailBreach = {
  Name: string; Title: string; Domain: string | null; BreachDate: string;
  AddedDate: string; PwnCount: number; DataClasses: string[]; IsVerified: boolean;
  IsSensitive: boolean; LogoPath?: string;
};

type EmailCheckResponse = {
  email: string; count: number; breaches: EmailBreach[]; ai_summary?: string; ai_error?: string;
};


const MODES: { key: Mode; label: string; hint: string }[] = [
  { key: "phishng", label: "Phishing Check", hint: "Analyze emails/text/links" },
  { key: "wifisec", label: "Wi-Fi Security", hint: "Harden router & network" },
  { key: "cybersec", label: "General Security", hint: "Cyber hygiene & triage" },
  { key: "emailbreached", label: "Breached Email", hint: "Check your email's health" },
];

export default function Page() {
  const [chatId, setChatId] = useState("");
  const [mode, setMode] = useState<Mode | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const formRef = useRef<HTMLFormElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);


  // initial load
  useEffect(() => {
    let id = getActiveChatId();
    if (!id) id = newChat().id;
    setChatId(id);
    const s = loadSession(id);
    setMode(s.mode);
    setMessages(s.messages);
  }, []);

  // react to sidebar selection
  useEffect(() => {
    const unsub = onActiveChange((id) => {
      const nextId = id || newChat().id;
      setChatId(nextId);
      const s = loadSession(nextId);
      setMode(s.mode);
      setMessages(s.messages);
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      });
    });
    return unsub;
  }, []);

  // auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);


function isEmailCheckMessage(
  m: any
): m is { kind: "emailcheck"; payload: EmailCheckResponse } {
  return m && m.kind === "emailcheck" && m.payload && typeof m.payload.email === "string";
}

  function labelFor(m?: Mode) {
    return MODES.find(x => x.key === m)?.label || "New chat";
  }

  function choose(m: Mode) {
    if (!chatId) return;
    setSessionMode(chatId, m);
    setMode(m);
    renameChat(chatId, labelFor(m));
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!chatId || !mode) return;
    const text = input.trim();
    if (!text) return;

    // const u: Message = { id: crypto.randomUUID(), role: "user", content: text, ts: Date.now() };
    const u: Message = { id: uuid(), role: "user", content: text, ts: Date.now() };
    setMessages(prev => [...prev, u]);
    appendMessage(chatId, u);
    setInput("");
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      // const data = await ask(mode, text, abortRef.current.signal);
      // // const a: Message = { id: crypto.randomUUID(), role: "assistant", content: data.answer || "(no answer)", ts: Date.now() };
      // const a: Message = { id: uuid(), role: "assistant", content: data.answer || "(no answer)", ts: Date.now() };
      // setMessages(prev => [...prev, a]);
      // appendMessage(chatId, a);
      // const data = await ask(mode, text, abortRef.current.signal, /* opts if any */);
      // let content: string;
      // if ("answer" in data) {
      //   // regular AI routes
      //   content = data.answer || "(no answer)";
      // } else {
      //   // emailbreached route
      //   content = renderEmailCheck(data as EmailCheckResponse);
      // }
      // const a: Message = { id: uuid(), role: "assistant", content, ts: Date.now() };
      // setMessages(prev => [...prev, a]);
      // appendMessage(chatId, a);
      const data = await ask(mode, text, abortRef.current.signal, /* opts if any */);

      if ("answer" in data) {
        // regular AI
        const a: Message = { id: uuid(), role: "assistant", content: data.answer || "(no answer)", ts: Date.now(), kind: "text" };
        setMessages(prev => [...prev, a]);
        appendMessage(chatId, a);
      } else {
        // emailbreached → show table UI
        console.log(data);
        const summary = data.count
          ? `${data.count} breach(es) found for ${data.email}`
          : `No breaches found for ${data.email}.`;

        const a: Message = {
          id: uuid(),
          role: "assistant",
          content: summary,       // short headline still stored/searchable
          ts: Date.now(),
          kind: "emailcheck",
          payload: data as EmailCheckResponse
        };
        setMessages(prev => [...prev, a]);
        appendMessage(chatId, a);
      }
    } catch (err: any) {
      // const a: Message = { id: crypto.randomUUID(), role: "assistant", content: `⚠️ ${err?.message || "Request failed"}`, ts: Date.now() };
      const a: Message = { id: uuid(), role: "assistant", content: `⚠️ ${err?.message || "Request failed"}`, ts: Date.now() };
      setMessages(prev => [...prev, a]);
      appendMessage(chatId, a);
    } finally {
      setLoading(false);
    }
  }

  const lockedNote = useMemo(
    () => (mode ? `This chat is locked to “${labelFor(mode)}”. Create a new chat to use another function.` : ""),
    [mode]
  );

  // No mode chosen → center the function options; hide composer
  if (!mode) {
    return (
      <section
        style={{
          minHeight: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 16
        }}
      >
        <h1>Choose a function</h1>
        <div className="fn-grid" role="listbox" aria-label="Choose function" style={{ maxWidth: 560 }}>
          {MODES.map(m => (
            <button key={m.key} className="fn" onClick={() => choose(m.key)}>
              <strong>{m.label}</strong>
              <div className="note">{m.hint}</div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  // Mode chosen → show chat + sticky composer
  return (
    <section style={{ display: "contents" }}>
      <h1>Chat</h1>
      <p className="note">{lockedNote}</p>

      <div className="chat" style={{ marginTop: 12 }}>
      {messages.map((msg) => (
        <div key={msg.id} className={`msg ${msg.role}`}>
          {isEmailCheckMessage(msg) ? (
            <EmailCheckResult data={msg.payload} />
          ) : (
            msg.content
          )}
        </div>
      ))}
    </div>

      {/* <div className="composer">
        <form onSubmit={onSend} className="chatbar">
          <input
            className="input"
            placeholder="Type your message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button className="btn primary" disabled={loading}>
            {loading ? "Sending…" : "Send"}
          </button>
        </form>
      </div> */}
      <div className="composer p-2">
        <form ref={formRef} onSubmit={onSend} className="chatbar">
          <textarea
            ref={taRef}
            className="input p-2"
            placeholder="Type your message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onInput={() => {
              const ta = taRef.current;
              if (!ta) return;
              ta.style.height = "auto";
              ta.style.height = Math.min(ta.scrollHeight, 300) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (e.altKey || e.shiftKey) return; // allow newline
                e.preventDefault();
                if (!loading) formRef.current?.requestSubmit();
              }
            }}
            disabled={loading}
            rows={1}
          />
          <button className="btn primary" disabled={loading}>
            {loading ? "Sending…" : "Send"}
          </button>
        </form>
      </div>

    </section>
  );
}
