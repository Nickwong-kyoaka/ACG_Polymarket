import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "ACG Exchange | Character Support Signals",
  description:
    "A bilingual, positive-only ACG character exchange with support signals, comfort rooms, soft tokens, and collectible cosmetics.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await headers()).get("x-acg-public-locale") === "zh-Hant" ? "zh-Hant" : "en";
  return (
    <html lang={locale} className="h-full antialiased" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-full bg-background text-slate-950">
        <div className="acg-page-shell relative min-h-dvh overflow-hidden">
          <div className="exchange-noise pointer-events-none fixed inset-0" />
          <div className="relative flex min-h-dvh flex-col">
            <SiteHeader />
            <main className="flex-1 pb-20 lg:pb-0">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
