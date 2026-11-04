import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import "@fontsource-variable/manrope";
import "@fontsource-variable/noto-sans-tc";
import "./globals.css";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { SiteHeader } from "@/components/site-header";
import { auth } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { prisma } from "@/lib/prisma";

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
  const account = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { wallet: { select: { softBalance: true } }, _count: { select: { notifications: { where: { readAt: null } } } } } }).catch(() => null) : null;
  return (
    <html lang={locale} className="h-full antialiased" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-full bg-background text-slate-950">
        <div className="acg-page-shell relative min-h-dvh overflow-hidden">
          <div className="exchange-noise pointer-events-none fixed inset-0" />
          <div className="relative flex min-h-dvh flex-col">
            <Suspense fallback={<div className="h-14 border-b border-slate-200 bg-white lg:h-16" />}><SiteHeader signedIn={Boolean(session?.user?.id)} viewerName={session?.user?.name} features={features} balance={account?.wallet?.softBalance} unreadCount={account?._count.notifications} /></Suspense>
            <main id="main-content" tabIndex={-1} className="flex-1 pb-20 lg:pb-0">{children}</main>
            <AnalyticsBeacon />
          </div>
        </div>
      </body>
    </html>
  );
}
