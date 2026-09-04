import Link from "next/link";

interface ProbabilityBucket {
  timestamp: string;
  yesProbabilityBps: number;
  grossVolume: number;
}

export function PredictionProbabilityChart({
  buckets,
  range,
  baseHref,
  locale,
}: {
  buckets: ProbabilityBucket[];
  range: "24h" | "7d" | "30d";
  baseHref: string;
  locale: "en" | "zh-Hant";
}) {
  const width = 760;
  const height = 260;
  const values = buckets.map((bucket) => bucket.yesProbabilityBps / 100);
  const min = Math.max(0, Math.floor((Math.min(...values, 50) - 8) / 10) * 10);
  const max = Math.min(100, Math.ceil((Math.max(...values, 50) + 8) / 10) * 10);
  const span = Math.max(10, max - min);
  const points = buckets.map((bucket, index) => {
    const x = buckets.length <= 1 ? width / 2 : (index / (buckets.length - 1)) * width;
    const y = height - ((bucket.yesProbabilityBps / 100 - min) / span) * height;
    return `${x.toFixed(1)},${Math.min(height, Math.max(0, y)).toFixed(1)}`;
  }).join(" ");
  const zh = locale === "zh-Hant";

  return (
    <section className="border border-[#2c2724]/20 bg-[#fffaf4] p-5 sm:p-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[10px] font-black uppercase tracking-[.17em] text-[#9a4c4a]">PROBABILITY TRACE</p><h2 className="mt-2 font-display text-2xl sm:text-3xl">{zh ? "Yes 機率走勢" : "Yes probability trace"}</h2></div>
        <nav className="flex border border-[#2c2724]" aria-label={zh ? "走勢時間範圍" : "Chart range"}>{(["24h", "7d", "30d"] as const).map((item) => <Link key={item} href={`${baseHref}?range=${item}`} className={`px-3 py-2 text-[10px] font-black uppercase ${item === range ? "bg-[#2c2724] text-white" : "bg-white text-[#716862]"}`}>{item}</Link>)}</nav>
      </header>
      <div className="mt-6 overflow-hidden border-y border-[#2c2724]/15 py-4">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={zh ? `過去 ${range} 的 Yes 機率` : `Yes probability over ${range}`} className="h-auto w-full overflow-visible">
          {[0, 1, 2, 3, 4].map((line) => <line key={line} x1="0" x2={width} y1={(height / 4) * line} y2={(height / 4) * line} stroke="rgba(44,39,36,.12)" strokeWidth="1" />)}
          <polyline points={points} fill="none" stroke="#5f8f87" strokeWidth="7" strokeLinecap="square" strokeLinejoin="bevel" />
          {points ? <circle cx={points.split(" ").at(-1)?.split(",")[0]} cy={points.split(" ").at(-1)?.split(",")[1]} r="8" fill="#c85d5a" stroke="#fffaf4" strokeWidth="4" /> : null}
        </svg>
      </div>
      <div className="mt-3 flex justify-between text-[10px] font-bold text-[#716862]"><span>{buckets[0] ? new Date(buckets[0].timestamp).toLocaleDateString(locale === "zh-Hant" ? "zh-HK" : "en-US", { timeZone: "Asia/Hong_Kong" }) : ""}</span><span>{min}% – {max}%</span><span>{buckets.at(-1) ? new Date(buckets.at(-1)!.timestamp).toLocaleDateString(locale === "zh-Hant" ? "zh-HK" : "en-US", { timeZone: "Asia/Hong_Kong" }) : ""}</span></div>
    </section>
  );
}
