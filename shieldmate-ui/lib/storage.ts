export type Mode = "phishng" | "wifisec" | "cybersec";
export type Chat = { id: string; title: string; createdAt: number };
export type Message = { id: string; role: "user" | "assistant"; content: string; ts: number };
export type Session = { id: string; mode?: Mode; messages: Message[] };

const CHATS_KEY = "sm_chats";
const ACTIVE_KEY = "sm_active_chat_id";
const CLIENT_KEY = "sm_client_id";
const SHARE_KEY = "sm_share_opt_in";
const SESSION_PREFIX = "sm_chat_";
const ACTIVE_EVT = "sm:active-changed";


type ActiveChangeHandler = (id: string) => void;

function emitActiveChange(id: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(ACTIVE_EVT, { detail: id }));
}

export function onActiveChange(cb: ActiveChangeHandler) {
  const handler = (e: Event) => cb((e as CustomEvent<string>).detail || getActiveChatId());
  window.addEventListener(ACTIVE_EVT, handler as EventListener);
  return () => window.removeEventListener(ACTIVE_EVT, handler as EventListener);
}


export function ensureClientId() {
  if (typeof window === "undefined") return;
  let id = localStorage.getItem(CLIENT_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

/* ---- chats list ---- */
export function getChats(): Chat[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CHATS_KEY) || "[]"); }
  catch { return []; }
}
export function saveChats(chats: Chat[]) {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}
export function renameChat(id: string, title: string) {
  const chats = getChats().map(c => c.id === id ? { ...c, title } : c);
  saveChats(chats);
}
export function newChat(): Chat {
  const c: Chat = { id: crypto.randomUUID(), title: "New chat", createdAt: Date.now() };
  const chats = getChats();
  chats.unshift(c);
  saveChats(chats);
  setActiveChatId(c.id);
  // create empty session
  saveSession({ id: c.id, messages: [] });
  return c;
}
export function setActiveChatId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
  emitActiveChange(id);
}

export function deleteChat(id: string) {
  const next = getChats().filter(c => c.id !== id);
  saveChats(next);
  localStorage.removeItem(SESSION_PREFIX + id);
  const active = getActiveChatId();
  if (active === id) {
    setActiveChatId(next[0]?.id || ""); // emits change
  }
}

export function getActiveChatId() { return localStorage.getItem(ACTIVE_KEY) || ""; }

/* ---- share opt-in ---- */
export function getShareOptIn(): boolean { return localStorage.getItem(SHARE_KEY) === "1"; }
export function setShareOptIn(v: boolean) { localStorage.setItem(SHARE_KEY, v ? "1" : "0"); }

/* ---- per-session ---- */
export function loadSession(id: string): Session {
  if (typeof window === "undefined") return { id, messages: [] };
  try {
    const raw = localStorage.getItem(SESSION_PREFIX + id);
    return raw ? (JSON.parse(raw) as Session) : { id, messages: [] };
  } catch {
    return { id, messages: [] };
  }
}
export function saveSession(s: Session) {
  localStorage.setItem(SESSION_PREFIX + s.id, JSON.stringify(s));
}
export function setSessionMode(id: string, mode: Mode) {
  const s = loadSession(id);
  s.mode = mode;
  saveSession(s);
}
export function appendMessage(id: string, msg: Message) {
  const s = loadSession(id);
  s.messages.push(msg);
  saveSession(s);
}
