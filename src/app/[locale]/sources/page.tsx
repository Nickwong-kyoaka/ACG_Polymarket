import { ExternalLink, FileCheck2, ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { isPublicLocale } from "@/components/acg-locale";
import { TakedownForm } from "@/components/takedown-form";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCharacterView, listCharacters } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SourcesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ asset?: string }> }) {
  const [{ locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const characters = await listCharacters({ locale });
  const rows = (await Promise.all(characters.map(async (character) => {
    const view = await getCharacterView(character.id, locale);
    const assetSources = view.assets.filter((asset) => asset.workflowStatus === "PUBLISHED" && asset.sourceUrl).map((asset) => ({ id: asset.id, character: character.name, label: asset.label, sourceLabel: asset.sourceLabel ?? asset.sourceKind ?? "Source record", sourceUrl: asset.sourceUrl!, license: [asset.permissionStatus, asset.licenseName ?? (asset.sourceKind === "AI_GENERATED" ? "AI GENERATED" : "SOURCE ON FILE")].filter(Boolean).join(" · ") }));
    if (!assetSources.length && view.sourceAttribution) return [{ id: view.sourceAttribution.id, character: character.name, label: character.sourceTitle ?? character.title, sourceLabel: view.sourceAttribution.sourceLabel, sourceUrl: view.sourceAttribution.sourceUrl, license: view.sourceAttribution.licenseName }];
    return assetSources;
  }))).flat();
  const copy = locale === "zh-Hant" ? { eyebrow: "PUBLIC SOURCE REGISTER", title: "每張圖片，都有可以翻回去的頁碼。", body: "這本登記冊整理角色資料與公開素材的來源頁、創作者、權限標籤和聯絡方式，讓畫廊的每件收藏都找得到來處。", entries: `${rows.length} 筆公開來源`, character: "角色", media: "素材／資料", permission: "授權／權限訊號", open: "翻到來源" } : { eyebrow: "PUBLIC SOURCE REGISTER", title: "Every image has a page you can turn back to.", body: "This register gathers the source page, creator, permission label, and contact route behind character metadata and published media.", entries: `${rows.length} public records`, character: "Character", media: "Media / metadata", permission: "License / permission signal", open: "Visit source" };
  return <div className="exchange-page">
    <header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.body} /><div className="rounded-[18px_5px_18px_5px] bg-[#111827] px-5 py-4 text-sm font-black text-white"><FileCheck2 className="mr-2 inline h-4 w-4 text-[#3ed6e0]" />{copy.entries}</div></header>
    <section className="exchange-panel overflow-hidden"><div className="hidden grid-cols-[.8fr_1.2fr_1fr_auto] gap-4 border-b border-black/8 bg-[#f5f1e8] px-6 py-4 text-[9px] font-black uppercase tracking-[.17em] text-slate-400 md:grid"><span>{copy.character}</span><span>{copy.media}</span><span>{copy.permission}</span><span>{copy.open}</span></div>{rows.map((row) => <article key={`${row.id}-${row.sourceUrl}`} className="grid gap-3 border-b border-black/7 px-6 py-5 last:border-0 md:grid-cols-[.8fr_1.2fr_1fr_auto] md:items-center"><p className="font-black text-slate-800">{row.character}</p><div><p className="text-sm font-bold text-slate-600">{row.label}</p><p className="mt-1 text-[10px] uppercase tracking-[.12em] text-slate-400">{row.sourceLabel}</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#eef8f7] px-3 py-1 text-[9px] font-black uppercase tracking-[.13em] text-[#19757a]"><ShieldAlert className="h-3 w-3" />{row.license}</span><a href={row.sourceUrl} target="_blank" rel="noreferrer" className="exchange-button-secondary px-3 py-2"><ExternalLink className="h-4 w-4" /><span className="md:sr-only">{copy.open}</span></a></article>)}</section>
    <TakedownForm locale={locale} defaultAssetId={query.asset ?? ""} assets={rows.map((row) => ({ id: row.id, label: row.label, character: row.character }))} />
  </div>;
}
