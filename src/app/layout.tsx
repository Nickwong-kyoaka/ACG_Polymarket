import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "ACG Support Market",
  description: "A positive-only character support market for anime and ACG fandoms.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#fff8ef] font-sans text-slate-950">
        <div className="relative min-h-full overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,170,120,0.28),_transparent_40%),radial-gradient(circle_at_80%_20%,_rgba(120,170,255,0.16),_transparent_28%),linear-gradient(180deg,_#fff8ef_0%,_#fffaf6_45%,_#fdf2e4_100%)]" />
          <div className="relative flex min-h-full flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
