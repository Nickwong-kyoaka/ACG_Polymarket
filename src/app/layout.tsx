import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { SiteHeader } from "@/components/site-header";
import { auth } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";

export const metadata: Metadata = {
  title: "ACG Exchange | Fandom, Support, and Season Predictions",
  description:
    "A bilingual ACG clubroom for character notes, support signals, seasonal anime tracking, comfort stories, and source-led predictions.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [headerStore, session] = await Promise.all([headers(), auth()]);
  const locale = headerStore.get("x-acg-public-locale") === "zh-Hant" ? "zh-Hant" : "en";
  const features = getExchangeFeatureFlags();
  return (
    <html lang={locale} className="h-full antialiased" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-full bg-background text-slate-950">
        <div className="acg-page-shell relative min-h-dvh overflow-hidden">
          <div className="exchange-noise pointer-events-none fixed inset-0" />
          <div className="relative flex min-h-dvh flex-col">
            <SiteHeader signedIn={Boolean(session?.user?.id)} viewerName={session?.user?.name} features={features} />
            <main className="flex-1 pb-20 lg:pb-0">{children}</main>
            <AnalyticsBeacon />
          </div>
        </div>
      </body>
    </html>
  );
}
