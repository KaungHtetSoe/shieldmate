import "./globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import MobileChrome from "@/components/MobileChrome";

export const metadata: Metadata = {
  title: "Shield Mate",
  description: "Chat UI for cybersecurity",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MobileChrome />
        <div className="shell" data-open="0">
          <Sidebar />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
