'use client'

import Logo from "./Logo";

export default function Topbar() {

    return(
        <div className="topbar">
          <Logo/>
          <button className="btn" onClick={()=>{
            const el = document.querySelector(".shell") as HTMLElement | null;
            if (el) el.dataset.open = el.dataset.open === "1" ? "0" : "1";
          }}>☰</button>
        </div>

    )

}