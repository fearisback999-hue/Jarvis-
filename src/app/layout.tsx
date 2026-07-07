import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar, MobileNav } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "JARVIS — Personal AI OS",
  description: "Your always-on AI operating system: wealth, business, boxing, law, fitness, faith.",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Sidebar />
        <MobileNav />
        <main className="min-h-screen pb-16 md:pb-0 md:pl-[210px]">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
