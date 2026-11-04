import Link from "next/link";
import { localePath, pick, type PublicLocale } from "@/components/acg-locale";
import type { PublicCharacterAsset } from "@/lib/public-assets";
import type { SourceAttribution } from "@/lib/types";

function sourceHref(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function CharacterSourceStatus({ locale, sourceKind, permissionStatus }: { locale: PublicLocale; sourceKind?: string | null; permissionStatus?: string | null }) {
  const kinds: Record<string, [string, string]> = {
    PLATFORM_ORIGINAL: ["Platform original", "平台原創"], AI_GENERATED: ["AI-generated visual", "AI 生成圖片"],
    OFFICIAL_REFERENCE: ["Official-source reference", "官方來源參考"], FAN_ART: ["Fan art", "同人作品"],
    OPEN_LICENSE: ["Open-license source", "開放授權來源"], USER_PROVIDED: ["User-provided source", "使用者提供來源"],
    BANGUMI_METADATA: ["Bangumi metadata", "Bangumi 資料"],
  };
  const statuses: Record<string, [string, string]> = {
    VERIFIED: ["Permission verified", "授權已驗證"], CREATOR_GRANTED: ["Creator permission recorded", "已記錄創作者許可"],
    UNVERIFIED: ["Permission unverified", "授權未驗證"], REJECTED: ["Permission rejected", "授權已拒絕"],
    TAKEDOWN_REQUESTED: ["Takedown requested", "已要求下架"],
  };
  const kind = kinds[sourceKind ?? ""];
  const status = statuses[permissionStatus ?? ""];
  return <p className="text-xs leading-5 text-slate-600">{kind ? pick(locale, ...kind) : pick(locale, "Source record", "來源記錄")} · <strong className="font-bold">{status ? pick(locale, ...status) : pick(locale, "Permission not recorded", "未記錄授權狀態")}</strong></p>;
}

export function CharacterSourceNotes({ locale, characterSlug, assets, attribution }: { locale: PublicLocale; characterSlug: string; assets: PublicCharacterAsset[]; attribution?: SourceAttribution }) {
  const canonical = sourceHref(attribution?.sourceUrl);
  return <details id="sources" className="rounded-xl border border-slate-200 bg-white p-4">
    <summary className="cursor-pointer py-1 text-sm font-bold text-slate-900">{pick(locale, "Sources, permissions & credits", "來源、授權與鳴謝")}</summary>
    <div className="mt-4 grid gap-4 text-sm leading-6 text-slate-600">
      <p>{pick(locale, "A source link is not proof of permission. Only published SFW visuals are shown; unverified records remain labeled.", "來源連結不代表取得授權。此處僅展示已發布的 SFW 圖片，未驗證記錄會保留標示。")}</p>
      {attribution ? <div><p className="font-bold text-slate-900">{attribution.sourceLabel}</p><p>{attribution.attributionText}</p><p className="text-xs">{attribution.licenseName}</p>{canonical ? <a href={canonical} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-bold underline">{pick(locale, "Canonical character source (new tab)", "角色原始資料來源（另開分頁）")}</a> : <p>{pick(locale, "The source URL is unavailable; its record remains visible.", "來源網址暫不可用，記錄仍保留展示。")}</p>}</div> : null}
      {assets.map((asset) => {
        const href = sourceHref(asset.sourceUrl);
        return <article key={asset.id} className="border-t border-slate-200 pt-4">
          <p className="font-bold text-slate-900">{asset.label}</p>
          <CharacterSourceStatus locale={locale} sourceKind={asset.sourceKind} permissionStatus={asset.permissionBadge} />
          {asset.sourceLabel ? <p>{asset.sourceLabel}</p> : null}
          {asset.licenseName ? <p className="text-xs">{asset.licenseName}</p> : null}
          {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-bold underline">{pick(locale, "Visual source (new tab)", "圖片來源（另開分頁）")}</a> : <p className="text-xs">{pick(locale, "No public source URL recorded", "未記錄公開來源網址")}</p>}
        </article>;
      })}
      <Link href={localePath(locale, `/gallery/${characterSlug}`)} className="exchange-button-secondary min-h-11 text-sm">{pick(locale, "Full gallery, credits & takedown contact", "完整畫廊、素材來源與下架聯絡")}</Link>
      <Link href={localePath(locale, "/sources")} className="inline-flex min-h-11 items-center text-sm font-bold underline">{pick(locale, "Source policy & contact", "來源政策與聯絡方式")}</Link>
    </div>
  </details>;
}
