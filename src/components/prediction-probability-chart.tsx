"use client";

import Link from "next/link";
import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";

export interface ProbabilityBucket {
  timestamp: string;
  yesProbabilityBps: number;
  grossVolume: number;
  tradeCount?: number;
}
type Range = "24h" | "7d" | "30d";
const bucketDuration: Record<Range, number> = { "24h": 3_600_000, "7d": 21_600_000, "30d": 86_400_000 };

export function probabilityChartPoints(buckets: ProbabilityBucket[], range: Range) {
  const valid = buckets.filter((bucket) => Number.isFinite(Date.parse(bucket.timestamp)) && Number.isFinite(bucket.yesProbabilityBps))
    .toSorted((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const start = valid[0] ? Date.parse(valid[0].timestamp) : 0;
  const end = valid.at(-1) ? Date.parse(valid.at(-1)!.timestamp) + bucketDuration[range] : bucketDuration[range];
  return valid.map((bucket) => ({ ...bucket, x: ((Date.parse(bucket.timestamp) - start) / (end - start)) * 1000,
    y: 200 - Math.min(10_000, Math.max(0, bucket.yesProbabilityBps)) / 50 }));
}

export function PredictionProbabilityChart({ buckets, range, baseHref, locale }: {
  buckets: ProbabilityBucket[]; range: Range; baseHref: string; locale: "en" | "zh-Hant";
}) {
  return <Chart key={`${range}:${buckets[0]?.timestamp ?? "empty"}`} buckets={buckets} range={range} baseHref={baseHref} locale={locale} />;
}

function Chart({ buckets, range, baseHref, locale }: {
  buckets: ProbabilityBucket[]; range: Range; baseHref: string; locale: "en" | "zh-Hant";
}) {
  const zh = locale === "zh-Hant";
  const id = useId();
  const points = probabilityChartPoints(buckets, range);
  const [selected, setSelected] = useState(Math.max(0, points.length - 1));
  const index = Math.min(selected, points.length - 1);
  const point = points[index];
  const maxVolume = Math.max(1, ...points.map((bucket) => bucket.grossVolume));
  const totalVolume = points.reduce((sum, bucket) => sum + bucket.grossVolume, 0);
  const formatter = new Intl.DateTimeFormat(zh ? "zh-HK" : "en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Hong_Kong" });
  const formatTime = (timestamp: string | number) => formatter.format(new Date(timestamp));
  const description = point ? `${formatTime(point.timestamp)} HKT · YES ${(point.yesProbabilityBps / 100).toFixed(1)}% · ${zh ? "活動量" : "Volume"} ${point.grossVolume} SUP${point.tradeCount === undefined ? "" : ` · ${point.tradeCount} ${zh ? "筆交易" : "trades"}`}` : "";

  function selectAt(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !points.length) return;
    const x = Math.max(0, Math.min(1000, (event.clientX - rect.left) / rect.width * 1000));
    let nearest = 0;
    points.forEach((candidate, candidateIndex) => { if (Math.abs(candidate.x - x) < Math.abs(points[nearest].x - x)) nearest = candidateIndex; });
    setSelected(nearest);
  }
  function keyboard(event: KeyboardEvent<SVGSVGElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    setSelected(event.key === "Home" ? 0 : event.key === "End" ? points.length - 1 : Math.max(0, Math.min(points.length - 1, index + (["ArrowRight", "ArrowUp"].includes(event.key) ? 1 : -1))));
  }
  function rangeHref(next: Range) {
    const [path, query = ""] = baseHref.split("?");
    const params = new URLSearchParams(query);
    params.set("range", next);
    return `${path}?${params}`;
  }

  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 text-[#222733] sm:p-6" aria-labelledby={`${id}-title`}>
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 id={`${id}-title`} className="text-xl font-bold">{zh ? "YES 機率走勢" : "YES probability"}</h2><p className="mt-1 text-xs text-[#606A78]">{zh ? "固定 0–100% 標尺 · 香港時間（UTC+8）" : "Fixed 0–100% scale · Hong Kong time (UTC+8)"}</p></div><nav className="flex gap-1 rounded-xl bg-slate-50 p-1" aria-label={zh ? "走勢時間範圍" : "Chart range"}>{(["24h", "7d", "30d"] as const).map((item) => <Link key={item} href={rangeHref(item)} scroll={false} aria-current={item === range ? "page" : undefined} className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#C4455C] ${item === range ? "bg-slate-800 text-white" : "text-[#606A78]"}`}>{item}</Link>)}</nav></header>
    {!points.length ? <div className="my-6 grid min-h-52 place-content-center rounded-xl bg-slate-50 px-4 text-center"><p className="text-sm font-semibold">{zh ? "尚無交易記錄" : "No trade history yet"}</p><p className="mt-2 text-xs text-[#606A78]">{zh ? "有資料後會顯示實際機率與活動量。" : "Actual probability and activity will appear when data is available."}</p><p className="mt-3 text-xs text-[#606A78]">0% – 100%</p></div> : <>
      <p id={`${id}-instructions`} className="mt-4 text-xs leading-5 text-[#606A78]">{zh ? "指向或觸碰走勢查看資料；鍵盤左右鍵逐點查看，Home / End 跳至首尾。" : "Hover or touch to inspect. Use arrow keys for points, Home / End for the first / last point."}</p>
      <div className="mt-5 grid grid-cols-[2.75rem_minmax(0,1fr)] gap-2">
        <div className="relative h-52 text-right text-xs text-[#606A78]" aria-hidden="true">{[100, 75, 50, 25, 0].map((value) => <span key={value} className="absolute right-0" style={{ top: `${100 - value}%`, transform: value === 100 ? "none" : value === 0 ? "translateY(-100%)" : "translateY(-50%)" }}>{value}%</span>)}</div>
        <svg viewBox="0 0 1000 200" preserveAspectRatio="none" role="slider" tabIndex={0} aria-label={zh ? "機率資料點" : "Probability data point"} aria-describedby={`${id}-instructions`} aria-valuemin={1} aria-valuemax={points.length} aria-valuenow={index + 1} aria-valuetext={description} onKeyDown={keyboard} onPointerMove={selectAt} onPointerDown={(event) => { event.currentTarget.focus(); selectAt(event); }} className="h-52 w-full touch-pan-y overflow-visible rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C4455C]">
          {[0, 50, 100, 150, 200].map((y) => <line key={y} x1={0} x2={1000} y1={y} y2={y} stroke="#E2E8F0" vectorEffect="non-scaling-stroke" />)}
          {points.length > 1 && <polyline data-testid="probability-line" points={points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#177B65" strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />}
          {point && <><line x1={point.x} x2={point.x} y1={0} y2={200} stroke="#606A78" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" /><ellipse cx={point.x} cy={point.y} rx={6} ry={3} fill="#C4455C" stroke="white" strokeWidth={2} vectorEffect="non-scaling-stroke" /></>}
        </svg>
        <div className="text-right text-xs text-[#606A78]" aria-hidden="true">SUP</div>
        <div><svg viewBox="0 0 1000 60" preserveAspectRatio="none" role="img" aria-label={zh ? "各時間區間實際 SUP 活動量" : "Actual SUP volume per time bucket"} className="h-16 w-full"><line x1={0} x2={1000} y1={60} y2={60} stroke="#E2E8F0" />{points.map((p, i) => <rect key={`${p.timestamp}:${i}`} data-testid="activity-bar" x={p.x} y={60 - p.grossVolume / maxVolume * 56} width={Math.max(1, (i < points.length - 1 ? points[i + 1].x - p.x : 1000 - p.x) - 3)} height={p.grossVolume / maxVolume * 56} fill={i === index ? "#C4455C" : "#CBD5E1"}><title>{formatTime(p.timestamp)} HKT: {p.grossVolume} SUP</title></rect>)}</svg></div>
        <div />
        <div className="flex justify-between gap-2 text-xs leading-5 text-[#606A78]"><span>{formatTime(points[0].timestamp)}</span><span className="text-right">{formatTime(Date.parse(points.at(-1)!.timestamp) + bucketDuration[range])}</span></div>
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm" aria-live="polite" aria-atomic="true"><p className="font-semibold">{description}</p><p className="mt-1 text-xs text-[#606A78]">{zh ? `區間起點；每格 ${range === "24h" ? "1 小時" : range === "7d" ? "6 小時" : "1 天"}。活動量不含費用。` : `Bucket start; each bucket is ${range === "24h" ? "1 hour" : range === "7d" ? "6 hours" : "1 day"}. Volume excludes fees.`}</p></div>
      {points.length === 1 && <p className="mt-3 text-xs text-[#606A78]">{zh ? "只有一個資料點，尚無連續走勢。" : "One data point only; no continuous trend yet."}</p>}
      {points.every((p) => p.tradeCount === 0 || (p.tradeCount === undefined && p.grossVolume === 0)) && <p className="mt-3 text-xs text-[#606A78]">{zh ? "此區間尚無交易，機率沿用之前的值。" : "No trades in this range; probability is carried forward."}</p>}
      <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[#606A78]">{zh ? "查看所有資料點" : "View all data points"}</summary><div className="max-h-64 overflow-auto"><table className="w-full text-left text-xs"><caption className="pb-3 text-left">{zh ? `此區間活動量合計 ${totalVolume} SUP` : `Total volume in this range: ${totalVolume} SUP`}</caption><thead><tr><th className="p-2">{zh ? "時間（HKT）" : "Time (HKT)"}</th><th className="p-2">YES</th><th className="p-2">SUP</th></tr></thead><tbody>{points.map((p, i) => <tr key={`${p.timestamp}:${i}`} className="border-t border-slate-100"><td className="p-2">{formatTime(p.timestamp)}</td><td className="p-2">{(p.yesProbabilityBps / 100).toFixed(1)}%</td><td className="p-2">{p.grossVolume}</td></tr>)}</tbody></table></div></details>
    </>}
  </section>;
}
