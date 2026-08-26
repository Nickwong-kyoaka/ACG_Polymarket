import Link from "next/link";
import { ArrowLeft, ExternalLink, Flag, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { CharacterArt } from "@/components/character-art";
import { isPublicLocale, localePath } from "@/components/acg-locale";
import { SectionHeading } from "@/components/ui/section-heading";
import { publishedVisuals } from "@/lib/public-assets";
import { getCharacterView } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CharacterGalleryPage({ params }: { params: Promise<{ locale: string; character: string }> }) {
  const { locale: rawLocale, character: slug } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const view = await getCharacterView(slug, locale).catch(() => null);
  if (!view) notFound();
  const visuals = publishedVisuals(view.assets);
  const copy = locale === "zh-Hant" ? { back: "返回畫廊", eyebrow: "CHARACTER WARDROBE", title: `${view.character.name} 的角色衣櫥`, body: "服裝、表情與不同時期的公開視覺，都附上來源頁、整理標籤與聯絡入口。", empty: "角色衣櫥仍在布置，先替你留下一張平台訊號海報。", source: "回到圖片來源", takedown: "聯絡素材管理" } : { back: "Back to gallery", eyebrow: "CHARACTER WARDROBE", title: `${view.character.name}'s visual wardrobe`, body: "Outfits, expressions, and visual eras include their source page, editorial label, and contact access.", empty: "This wardrobe is still being dressed, so a platform signal poster keeps the space warm for now.", source: "Visit image source", takedown: "Contact media desk" };
  const shown = visuals.length ? visuals : [undefined];
  return <div className="exchange-page">
    <Link href={localePath(locale, "/gallery")} className="inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-[#e83c62]"><ArrowLeft className="h-4 w-4" />{copy.back}</Link>
    <SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.body} />
    <section className="grid gap-6 xl:grid-cols-2">{shown.map((asset) => <article key={asset?.id ?? "signal"} className="exchange-panel overflow-hidden"><CharacterArt character={view.character} asset={asset} className="min-h-[520px]" /><div className="grid gap-4 p-6"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-2 rounded-full bg-[#eef8f7] px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-[#19757a]"><ShieldCheck className="h-3.5 w-3.5" />{asset?.permissionBadge ?? "SIGNAL FALLBACK"}</span><span className="text-xs font-bold text-slate-400">{asset?.label ?? copy.empty}</span></div>{asset?.sourceUrl?.startsWith("https://") ? <a href={asset.sourceUrl} target="_blank" rel="noreferrer" className="exchange-button-secondary w-fit"><ExternalLink className="h-4 w-4" />{copy.source}</a> : null}<Link href={`${localePath(locale, "/sources")}?asset=${asset?.id ?? ""}`} className="inline-flex items-center gap-2 text-xs font-black text-[#e83c62]"><Flag className="h-4 w-4" />{copy.takedown}</Link></div></article>)}</section>
  </div>;
}
