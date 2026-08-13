import { Aperture } from "lucide-react";
import { notFound } from "next/navigation";
import { AssetSourceCard } from "@/components/asset-source-card";
import { isPublicLocale } from "@/components/acg-locale";
import { SectionHeading } from "@/components/ui/section-heading";
import { publishedVisuals } from "@/lib/public-assets";
import { getCharacterView, listCharacters } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function GalleryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const characters = await listCharacters({ locale });
  const entries = await Promise.all(characters.map(async (character) => {
    const view = await getCharacterView(character.id, locale);
    return { character, asset: publishedVisuals(view.assets)[0] };
  }));
  const copy = locale === "zh-Hant" ? {
    eyebrow: "PUBLISHED VISUAL ARCHIVE", title: "角色畫廊，每張圖都有自己的履歷。", body: "平台原創、AI 生成、開放授權與未驗證參考素材會分開標示。沒有可發布圖片的角色使用訊號立繪，不會冒充官方素材。", count: `${entries.length} 個角色訊號`, note: "外部圖片由 S3/CDN 提供；下架後不會殘留在 Git 歷史。",
  } : {
    eyebrow: "PUBLISHED VISUAL ARCHIVE", title: "A character gallery where every image has a record.", body: "Original, AI-generated, open-license, and unverified reference lanes are visibly separated. Characters without a publishable image use signal art rather than pretending to be official media.", count: `${entries.length} character signals`, note: "External image bytes are served from S3/CDN and never committed to Git history.",
  };
  return <div className="exchange-page">
    <header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.body} /><div className="rounded-[18px_5px_18px_5px] bg-[#111827] px-5 py-4 text-sm font-black text-white"><Aperture className="mr-2 inline h-4 w-4 text-[#ffcc66]" />{copy.count}</div></header>
    <p className="-mt-4 text-xs font-bold text-slate-400">{copy.note}</p>
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{entries.map((entry) => <AssetSourceCard key={entry.character.id} {...entry} locale={locale} />)}</section>
  </div>;
}
