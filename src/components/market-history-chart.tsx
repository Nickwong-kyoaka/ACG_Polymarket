"use client";

import { useEffect, useId, useState } from "react";
import { Activity, Users } from "lucide-react";
import { cn, compactNumber, currencyLabel } from "@/lib/utils";

type Range = "24h" | "7d" | "30d";
type Point = { timestamp: string; price: number; volume: number };

type HistoryPayload = {
  range?: Range;
  buckets?: Array<{ timestamp?: string; at?: string; price?: number; quote?: number; volume?: number; quantity?: number }>;
  history?: Array<{ timestamp?: string; at?: string; price?: number; quote?: number; volume?: number; quantity?: number }>;
  summary?: { currentQuote?: number; volume?: number; buyUnits?: number; uniqueSupporters?: number; changePercent?: number };
};

function normalize(payload: HistoryPayload) {
  const source = payload.buckets ?? payload.history ?? [];
  const points = source.flatMap((entry): Point[] => {
    const timestamp = entry.timestamp ?? entry.at;
    const price = entry.price ?? entry.quote;
    if (!timestamp || typeof price !== "number") return [];
    return [{ timestamp, price, volume: entry.volume ?? entry.quantity ?? 0 }];
  });
  return { points, summary: payload.summary };
}

function chartGeometry(points: Point[]) {
  if (!points.length) return { line: "", area: "", min: 0, max: 0 };
  const prices = points.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const spread = Math.max(max - min, 1);
  const width = 640;
  const height = 190;
  const line = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - ((point.price - min) / spread) * (height - 30) - 15;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return { line, area: `0,${height} ${line} ${width},${height}`, min, max };
}

export function MarketHistoryChart({
  characterId,
  locale = "en",
  compact = false,
}: {
  characterId: string;
  locale?: "en" | "zh-Hant";
  compact?: boolean;
}) {
  const [range, setRange] = useState<Range>("24h");
  const [points, setPoints] = useState<Point[]>([]);
  const [summary, setSummary] = useState<HistoryPayload["summary"]>();
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const gradientId = useId().replace(/:/g, "");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/characters/${encodeURIComponent(characterId)}/history?range=${range}`, { cache: "no-store" });
        if (!response.ok) throw new Error("history unavailable");
        const result = normalize(await response.json() as HistoryPayload);
        if (!active) return;
        setPoints(result.points);
        setSummary(result.summary);
        setStatus(result.points.length ? "ready" : "empty");
      } catch {
        if (active) setStatus("error");
      }
    };
    setStatus("loading");
    void load();
    const interval = window.setInterval(load, 15_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [characterId, range]);

  const geometry = chartGeometry(points);
  const copy = locale === "zh-Hant"
    ? { empty: "這段時間還沒有成交", error: "行情暫時無法讀取", volume: "成交量", supporters: "活躍應援者", label: "真實應援價格走勢" }
    : { empty: "No executions in this period", error: "Market history is unavailable", volume: "Volume", supporters: "Active supporters", label: "Real support quote history" };

  if (compact) {
    return (
      <div className="flex h-12 min-w-0 items-center justify-center" aria-label={copy.label}>
        {status === "ready" ? (
          <svg className="h-12 w-full" viewBox="0 0 640 220" role="img" aria-label={copy.label} preserveAspectRatio="none">
            <polyline points={geometry.line} fill="none" stroke="#ffcc66" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : <span className="text-center text-[9px] font-black uppercase tracking-[.12em] text-white/38">{status === "error" ? copy.error : copy.empty}</span>}
      </div>
    );
  }

  const maxVolume = Math.max(...points.map((point) => point.volume), 1);
  return (
    <div className="market-history" aria-busy={status === "loading"}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-[14px_4px_14px_4px] bg-black/20 p-1" aria-label="History range">
          {(["24h", "7d", "30d"] as const).map((entry) => (
            <button key={entry} type="button" onClick={() => setRange(entry)} className={cn("rounded-[10px_3px_10px_3px] px-4 py-2 text-[10px] font-black uppercase tracking-[.14em] text-white/42", range === entry && "bg-white text-slate-900")}>{entry}</button>
          ))}
        </div>
        {summary?.currentQuote ? <p className="text-xl font-black text-white">{currencyLabel(summary.currentQuote)}</p> : null}
      </div>

      <div className="relative h-64 overflow-hidden rounded-[22px_5px_22px_5px] border border-white/8 bg-black/18 p-4">
        {status === "ready" ? (
          <svg className="h-full w-full" viewBox="0 0 640 220" role="img" aria-label={`${copy.label}. ${geometry.min} to ${geometry.max} SUP.`} preserveAspectRatio="none">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffcc66" stopOpacity=".38" /><stop offset="1" stopColor="#ff4e72" stopOpacity="0" /></linearGradient>
            </defs>
            {[1, 2, 3].map((line) => <line key={line} x1="0" x2="640" y1={line * 55} y2={line * 55} stroke="rgba(255,255,255,.09)" strokeDasharray="5 7" />)}
            {points.map((point, index) => <rect key={`${point.timestamp}-v`} x={(index / Math.max(points.length, 1)) * 640} y={220 - (point.volume / maxVolume) * 46} width={Math.max(2, 560 / Math.max(points.length, 1))} height={(point.volume / maxVolume) * 46} rx="2" fill="rgba(62,214,224,.28)" />)}
            <polygon points={geometry.area} fill={`url(#${gradientId})`} />
            <polyline points={geometry.line} fill="none" stroke="#ffcc66" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : <div className="grid h-full place-items-center text-sm font-bold text-white/45">{status === "error" ? copy.error : copy.empty}</div>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[16px_4px_16px_4px] bg-white/6 p-4"><Activity className="h-4 w-4 text-[#ffcc66]" /><p className="mt-2 text-[9px] font-black uppercase tracking-[.16em] text-white/38">{copy.volume}</p><p className="mt-1 text-lg font-black text-white">{compactNumber(summary?.volume ?? points.reduce((sum, point) => sum + point.volume, 0))}</p></div>
        <div className="rounded-[16px_4px_16px_4px] bg-white/6 p-4"><Users className="h-4 w-4 text-[#3ed6e0]" /><p className="mt-2 text-[9px] font-black uppercase tracking-[.16em] text-white/38">{copy.supporters}</p><p className="mt-1 text-lg font-black text-white">{compactNumber(summary?.uniqueSupporters ?? 0)}</p></div>
      </div>
    </div>
  );
}
