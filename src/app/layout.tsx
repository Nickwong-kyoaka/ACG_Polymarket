import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { getRequestLocale } from "@/lib/request-locale";

export const metadata: Metadata = {
  title: "ACG Support Market | Character Support Lounge",
  description:
    "A bilingual positive-only ACG character support market with comfort rooms, soft tokens, and cosmetic unlocks.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale === "cn" ? "zh-Hant" : "en"} className="h-full antialiased">
      <body className="min-h-full bg-background font-sans text-slate-950" data-locale={locale}>
        <div className="acg-page-shell relative min-h-full overflow-hidden">
          <div className="sparkle-field pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(255,84,141,0.28),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(42,189,255,0.24),transparent_30%),radial-gradient(circle_at_50%_105%,rgba(255,215,91,0.24),transparent_32%)]" />
          <div className="relative flex min-h-full flex-col">
            <SiteHeader initialLocale={locale} />
            <main className="flex-1">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
