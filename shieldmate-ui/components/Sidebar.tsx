"use client";

import { useEffect, useState } from "react";
import {
  Chat, ensureClientId, getChats, newChat, deleteChat,
  getActiveChatId, setActiveChatId,
  getShareOptIn, setShareOptIn, renameChat
} from "@/lib/storage";
import Logo from "./Logo";

export default function Sidebar() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [active, setActive] = useState<string>("");
  const [share, setShare] = useState<boolean>(false);
  const [clientId, setClientId] = useState<string>("");

  // rename state
  const [editId, setEditId] = useState<string>("");
  const [editTitle, setEditTitle] = useState<string>("");

  useEffect(() => {
    setClientId(ensureClientId() || "");
    refresh();
  }, []);

  function refresh() {
    setChats(getChats());
    setActive(getActiveChatId());
    setShare(getShareOptIn());
  }

  function handleNew() {
    const c = newChat();
    refresh();
    setActive(c.id);
  }

  function handleSelect(id: string) {
    setActiveChatId(id);
    setActive(id);
  }

  function beginRename(c: Chat) {
    setEditId(c.id);
    setEditTitle(c.title || "");
  }

  function commitRename() {
    const title = editTitle.trim() || "Untitled";
    renameChat(editId, title);
    setEditId("");
    setEditTitle("");
    refresh();
  }

  function cancelRename() {
    setEditId("");
    setEditTitle("");
  }

  function handleDelete(id: string) {
    deleteChat(id);
    refresh();
  }

  return (
    <aside id="sm-sidebar" className="sidebar" role="navigation" aria-label="Chat history">
      <Logo/>

      <div className="row" style={{ marginBottom: 10 }}>
        <button className="btn primary w-full bg-blue-500 text-sm text-white" onClick={handleNew}>+ New chat</button>
      </div>

      <div className="small" title={clientId}>Client ID: {clientId.slice(0,8)}…</div>
      <hr />

      <label className="row small" style={{ gap:6, justifyContent:"space-between" }}>
        <span>Share data (opt-in)</span>
        <input
          type="checkbox"
          checked={share}
          onChange={(e)=>{ setShare(e.target.checked); setShareOptIn(e.target.checked); }}
          aria-label="Share data opt-in"
        />
      </label>

      <h4 className="dark:text-gray-700" style={{ margin: "12px 0 6px" }}>Chats</h4>
      <ul className="list">
        {chats.length === 0 && <li className="small">No chats yet.</li>}

        {chats.map((c) => {
          const isActive = c.id === active;
          const isEditing = c.id === editId;

          return (
            <li
              key={c.id}
              className={`item${isActive ? " active" : ""}`}
              aria-current={isActive}
              onClick={() => !isEditing && handleSelect(c.id)}
            >
              <div style={{ flex:1, minWidth:0 }}>
                {isEditing ? (
                  <input
                    className="title-edit dark:text-gray-500"
                    value={editTitle}
                    onChange={(e)=>setEditTitle(e.target.value)}
                    onKeyDown={(e)=> {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") cancelRename();
                    }}
                    autoFocus
                  />
                ) : (
                  <>
                    <div style={{ fontWeight: 700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} className="dark:text-gray-600">
                      {c.title || "Untitled"}
                    </div>
                    <div className="small">{new Date(c.createdAt).toLocaleString()}</div>
                  </>
                )}
              </div>

              <div className="actions" onClick={(e)=>e.stopPropagation()}>
                {!isEditing ? (
                  <>
                    <button
                      className="iconbtn text-blue-600"
                      title="Open"
                      aria-label={`Open ${c.title || "chat"}`}
                      onClick={()=>handleSelect(c.id)}
                    >
                      ↗
                    </button>
                    <button
                      className="iconbtn text-gray-600"
                      title="Rename"
                      aria-label={`Rename ${c.title || "chat"}`}
                      onClick={()=>beginRename(c)}
                    >
                      ✎
                    </button>
                    <button
                      className="iconbtn text-orange-600"
                      title="Delete"
                      aria-label={`Delete ${c.title || "chat"}`}
                      onClick={()=>handleDelete(c.id)}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <button className="iconbtn text-green-700 " title="Save" aria-label="Save" onClick={commitRename}>✔</button>
                    <button className="iconbtn text-orange-700" title="Cancel" aria-label="Cancel" onClick={cancelRename}> ✕ </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}


// "use client";

// import { useEffect, useState } from "react";
// import {
//   Chat, ensureClientId, getChats, newChat, deleteChat,
//   getActiveChatId, setActiveChatId,
//   getShareOptIn, setShareOptIn
// } from "@/lib/storage";

// export default function Sidebar() {
//   const [chats, setChats] = useState<Chat[]>([]);
//   const [active, setActive] = useState<string>("");
//   const [share, setShare] = useState<boolean>(false);
//   const [clientId, setClientId] = useState<string>("");

//   useEffect(() => {
//     setClientId(ensureClientId() || "");
//     setChats(getChats());
//     setActive(getActiveChatId());
//     setShare(getShareOptIn());
//   }, []);

//   function handleNew() {
//     const c = newChat();
//     setChats(getChats());
//     setActive(c.id);
//     // navigate if you later add /c/[id]; for now, main reads ACTIVE_KEY
//   }

//   function handleSelect(id: string) {
//     setActiveChatId(id);
//     setActive(id);
//   }

//   function handleDelete(id: string) {
//     deleteChat(id);
//     setChats(getChats());
//     setActive(getActiveChatId());
//   }
//     return (
//         <aside id="sm-sidebar" className="sidebar" role="navigation" aria-label="Chat history">
//         <div className="brand">🛡️ Shield Mate</div>
//         <div className="row" style={{ marginBottom: 10 }}>
//             <button className="btn primary" onClick={handleNew}>+ New chat</button>
//         </div>

//         <div className="small" title={clientId}>Client ID: {clientId.slice(0,8)}…</div>
//         <hr />
//         <label className="row small" style={{ gap:6, justifyContent:"space-between" }}>
//             <span>Share data (opt-in)</span>
//             <input
//             type="checkbox"
//             checked={share}
//             onChange={(e)=>{ setShare(e.target.checked); setShareOptIn(e.target.checked); }}
//             aria-label="Share data opt-in"
//             />
//         </label>

//         <h4 style={{ margin: "12px 0 6px" }}>Chats</h4>
//         <ul className="list">
//             {chats.length === 0 && <li className="small">No chats yet.</li>}
//             {chats.map(c => (
//             <li key={c.id} className="item" onClick={()=>handleSelect(c.id)} aria-current={active===c.id}>
//                 <div>
//                 <div style={{ fontWeight: 700 }}>{c.title || "Untitled"}</div>
//                 <div className="small">{new Date(c.createdAt).toLocaleString()}</div>
//                 </div>
//                 <button className="btn" onClick={(e)=>{e.stopPropagation(); handleDelete(c.id);}}>✕</button>
//             </li>
//             ))}
//         </ul>
//         </aside>
//     );
// }
