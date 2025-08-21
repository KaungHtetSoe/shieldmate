// "use client";

// import { useEffect, useState } from "react";
// import Logo from "./Logo";

// export default function MobileChrome() {
//   const [open, setOpen] = useState(false);

//   useEffect(() => {
//     const shell = document.querySelector(".shell") as HTMLElement | null;
//     if (!shell) return;
//     shell.dataset.open = open ? "1" : "0";

//     const onKey = (e: KeyboardEvent) => {
//       if (e.key === "Escape") setOpen(false);
//     };
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [open]);

//   return (
//     <>
//       <div className="topbar">
//         <Logo/>
//         <button
//           className="btn"
//           aria-label="Open menu"
//           aria-expanded={open}
//           aria-controls="sm-sidebar"
//           onClick={() => setOpen(v => !v)}
//         >
//           ☰
//         </button>
//       </div>

//       {/* Backdrop only on mobile; CSS handles visibility */}
//       <button
//         type="button"
//         className="backdrop"
//         aria-hidden={!open}
//         onClick={() => setOpen(false)}
//       />
//     </>
//   );
// }



"use client";

import { useEffect, useState } from "react";

export default function MobileChrome() {
  const [open, setOpen] = useState(false);

  // reflect state to DOM + lock body scroll
  useEffect(() => {
    const shell = document.querySelector(".shell") as HTMLElement | null;
    if (shell) shell.dataset.open = open ? "1" : "0";
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // CLICK/TAP OUTSIDE closes (mobile breakpoint only)
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!open) return;
      if (window.innerWidth > 800) return; // only when off-canvas is active
      const sidebar = document.getElementById("sm-sidebar");
      const btn = document.getElementById("sm-menu-btn");
      const target = e.target as Node;
      if (sidebar?.contains(target)) return; // clicks inside sidebar → ignore
      if (btn?.contains(target)) return;     // the menu button itself
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", onPointerDown, { capture: true } as any);
  }, [open]);

  return (
    <>
      <div className="topbar">
        <strong>🛡️ Shield Mate</strong>
        <button
          id="sm-menu-btn"
          className="btn"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="sm-sidebar"
          onClick={() => setOpen(v => !v)}
        >
          ☰
        </button>
      </div>

      {/* Backdrop still works; clicking it also closes */}
      <button
        type="button"
        className="backdrop"
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />
    </>
  );
}
