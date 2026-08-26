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
    eyebrow: "CHARACTER GALLERY", title: "翻開角色衣櫥，也看看每張圖從哪裡來。", body: "平台原創、AI 生成、開放授權與官方參考素材都有自己的小標籤；正在整理圖片的角色會先保留一張訊號海報。", count: `${entries.length} 個角色畫廊`, note: "來源記錄會跟著圖片一起留在畫廊，方便查閱與聯絡。",
  } : {
    eyebrow: "CHARACTER GALLERY", title: "Open the wardrobe and see where every image came from.", body: "Original, AI-generated, open-license, and official-reference visuals each carry a small label. Characters whose galleries are still being prepared keep a signal poster in their place.", count: `${entries.length} character galleries`, note: "Source records travel with the image so visitors can read more or get in touch.",
  };
  return <div className="exchange-page">
    <header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.body} /><div className="rounded-[18px_5px_18px_5px] bg-[#111827] px-5 py-4 text-sm font-black text-white"><Aperture className="mr-2 inline h-4 w-4 text-[#ffcc66]" />{copy.count}</div></header>
    <p className="-mt-4 text-xs font-bold text-slate-400">{copy.note}</p>
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{entries.map((entry) => <AssetSourceCard key={entry.character.id} {...entry} locale={locale} />)}</section>
  </div>;
}
