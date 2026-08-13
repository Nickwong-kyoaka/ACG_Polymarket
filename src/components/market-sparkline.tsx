import { cn } from "@/lib/utils";

export function MarketSparkline({
  seed,
  rising = true,
  className,
}: {
  seed: number;
  rising?: boolean;
  className?: string;
}) {
  const values = Array.from({ length: 8 }, (_, index) => {
    const wave = Math.sin((seed + index * 7) * 0.58) * 10;
    const drift = rising ? index * 3.1 : index * 1.2;
    return Math.max(8, Math.min(52, 24 + wave + drift));
  });
  const points = values.map((value, index) => `${index * 16},${60 - value}`).join(" ");

  return (
    <svg className={cn("h-12 w-full", className)} viewBox="0 0 112 60" role="img" aria-label="Decorative support trend">
      <defs>
        <linearGradient id={`spark-${seed}`} x1="0" x2="1">
          <stop offset="0" stopColor="#ff4e87" />
          <stop offset="1" stopColor="#ffb347" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={`url(#spark-${seed})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
