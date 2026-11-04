"use client";

import Link from "next/link";
import { localePath, type PublicLocale } from "@/components/acg-locale";

export interface CreatorSeriesOption { id: string; title: string; published: boolean; }

export function CreatorSeriesSelector({ series, value, onChange, locale, disabled = false }: {
  series: CreatorSeriesOption[]; value: string; onChange: (id: string) => void;
  locale: PublicLocale; disabled?: boolean;
}) {
  const zh = locale === "zh-Hant";
  return <div className="grid gap-2">
    <label className="text-xs font-bold">{zh ? "加入我的連載" : "Add to my series"}
      <select className="filter-field mt-2" name="creatorSeriesId" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        <option value="">{zh ? "獨立筆記" : "Standalone note"}</option>
        {series.map((item) => <option key={item.id} value={item.id}>{item.title}{item.published ? "" : zh ? "（未公開）" : " (private)"}</option>)}
      </select>
    </label>
    <Link href={localePath(locale, "/me/series")} className="text-xs font-bold text-[#a34855] underline">{zh ? "建立或管理連載" : "Create or manage series"}</Link>
    <p className="text-xs text-[#716862]">{zh ? "連載設定不會略過篇章審核。" : "Series membership never bypasses chapter review."}</p>
  </div>;
}
