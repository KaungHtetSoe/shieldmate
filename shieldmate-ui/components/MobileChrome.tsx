"use client";

import { useEffect, useState } from "react";

export default function MobileChrome() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const shell = document.querySelector(".shell") as HTMLElement | null;
    if (!shell) return;
    shell.dataset.open = open ? "1" : "0";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="topbar">
        <strong>🛡️ Shield Mate</strong>
        <button
          className="btn"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="sm-sidebar"
          onClick={() => setOpen(v => !v)}
        >
          ☰
        </button>
      </div>

      {/* Backdrop only on mobile; CSS handles visibility */}
      <button
        type="button"
        className="backdrop"
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />
    </>
  );
}
