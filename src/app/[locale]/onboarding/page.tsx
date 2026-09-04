import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Heart, Ticket } from "lucide-react";
import { AuthEntry } from "@/components/auth-entry";
import { isPublicLocale, localePath, type PublicLocale } from "@/components/acg-locale";
import { OnboardingPicker, type OnboardingCharacter } from "@/components/onboarding-picker";
import { getAuthAvailability, auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const zh = locale === "zh-Hant";
  return {
    title: zh ? "打開你的角色房間" : "Open your character room",
    description: zh ? "登入後挑選喜歡的作品、話題與角色，整理屬於你的 ACG Exchange。" : "Sign in, pick your interests and characters, and arrange an ACG Exchange room of your own.",
    robots: { index: false, follow: false },
  };
}

function safeNextPath(value: string | string[] | undefined, locale: PublicLocale) {
  const path = Array.isArray(value) ? value[0] : value;
  if (path?.startsWith("/") && !path.startsWith("//") && !path.startsWith("/api/auth")) return path;
  return localePath(locale, "/community");
}

function assetUrl(asset: { publicUrl: string | null; storageKey: string; derivatives: Array<{ kind: string; publicUrl: string }> } | undefined) {
  if (!asset) return null;
  const card = asset.derivatives.find((entry) => entry.kind === "CARD") ?? asset.derivatives[0];
  if (card?.publicUrl) return card.publicUrl;
  if (asset.publicUrl?.startsWith("https://") || asset.publicUrl?.startsWith("/")) return asset.publicUrl;
  return asset.storageKey.startsWith("assets/") ? `/${asset.storageKey}` : null;
}

export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale: rawLocale }, query, session] = await Promise.all([params, searchParams, auth()]);
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const zh = locale === "zh-Hant";
  const nextPath = safeNextPath(query.next ?? query.callbackUrl, locale);
  const availability = getAuthAvailability();

  const [characters, viewerState] = session?.user?.id ? await Promise.all([
    prisma.character.findMany({
      where: { publishStatus: "PUBLISHED" },
      orderBy: [{ isFeatured: "desc" }, { supporterCount: "desc" }],
      take: 12,
      select: {
        id: true, slug: true, name: true, title: true, accentFrom: true, accentTo: true,
        locales: { select: { locale: true, name: true, title: true } },
        assets: {
          where: { workflowStatus: "PUBLISHED", contentRating: "SFW", permissionStatus: { notIn: ["REJECTED", "TAKEDOWN_REQUESTED"] } },
          orderBy: [{ primaryPriority: "desc" }, { publishedAt: "desc" }],
          take: 1,
          select: { publicUrl: true, storageKey: true, altText: true, locales: { select: { locale: true, altText: true } }, derivatives: { select: { kind: true, publicUrl: true } } },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { profile: { select: { favoriteTags: true, onboardingCompletedAt: true } }, characterFollows: { select: { characterId: true } } },
    }),
  ]) : [[], null];

  const localeCode = locale === "zh-Hant" ? "ZH_HANT" : "EN";
  const choices: OnboardingCharacter[] = characters.map((character) => {
    const localized = character.locales.find((entry) => entry.locale === localeCode);
    const visual = character.assets[0];
    const visualLocale = visual?.locales.find((entry) => entry.locale === localeCode);
    return {
      id: character.id,
      slug: character.slug,
      name: localized?.name ?? character.name,
      title: localized?.title ?? character.title,
      imageUrl: assetUrl(visual),
      altText: visualLocale?.altText ?? visual?.altText ?? `${localized?.name ?? character.name} character visual`,
      accentFrom: character.accentFrom,
      accentTo: character.accentTo,
    };
  });

  return (
    <div className="onboarding-page">
      <section className="onboarding-cover">
        <div className="onboarding-cover-copy">
          <span className="onboarding-edition">WELCOME BOOK · 01</span>
          <p className="onboarding-kicker">{zh ? "角色、作品與你的小房間" : "CHARACTERS, STORIES, YOUR LITTLE ROOM"}</p>
          <h1>{zh ? "先從最近讓你心動的事開始。" : "Begin with whatever has your heart lately."}</h1>
          <p>{zh ? "挑幾個話題與角色，我們會把社群手帳、季番消息和應援訊號整理到你最容易看見的位置。" : "Pick a few topics and characters. We will arrange clubroom notes, seasonal news, and support signals where you can find them easily."}</p>
          <div className="onboarding-cover-details"><span><BookOpen />{zh ? "雙語角色手帳" : "Bilingual character notes"}</span><span><Heart />{zh ? "依喜好整理" : "Arranged around you"}</span><span><Ticket />{zh ? "300 SUP 入場票" : "300 SUP welcome ticket"}</span></div>
        </div>
        <div className="onboarding-cover-art" aria-hidden="true"><span>推</span><i>ACG<br />EXCHANGE</i><b>YOUR<br />FIRST<br />ISSUE</b></div>
      </section>

      {session?.user?.id ? (
        <>
          <div className="onboarding-welcome"><div><span>{zh ? "已登入" : "SIGNED IN"}</span><strong>{session.user.name ?? session.user.email ?? (zh ? "應援者" : "Supporter")}</strong></div>{viewerState?.profile?.onboardingCompletedAt ? <Link href={localePath(locale, "/community")}>{zh ? "直接回社群" : "Back to the clubroom"}<ArrowRight /></Link> : null}</div>
          <OnboardingPicker locale={locale} characters={choices} initialTags={viewerState?.profile?.favoriteTags ?? []} initialCharacterIds={viewerState?.characterFollows.map((follow) => follow.characterId) ?? []} nextPath={nextPath} />
        </>
      ) : (
        <section className="onboarding-signin-sheet">
          <div><span>01 / SIGN IN</span><h2>{zh ? "把這本手帳變成你的。" : "Make this notebook yours."}</h2><p>{zh ? "登入後才會保存關注、收藏與 SUP。你的錢包和應援紀錄預設只在自己的房間裡。" : "Sign in to keep follows, saves, and SUP. Your wallet and support records stay in your own room by default."}</p></div>
          <AuthEntry locale={locale} googleEnabled={availability.google} demoEnabled={availability.demo} redirectTo={`${localePath(locale, "/onboarding")}?step=interests&next=${encodeURIComponent(nextPath)}`} />
          <Link href={localePath(locale, "/community")} className="onboarding-guest-link">{zh ? "先以訪客逛社群" : "Browse the clubroom as a guest"}<ArrowRight /></Link>
        </section>
      )}
    </div>
  );
}
