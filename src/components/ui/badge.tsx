import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warm" | "cool" | "success";
}) {
  const tones = {
    neutral: "bg-black/5 text-slate-700 ring-black/10",
    warm: "bg-[#fff0da] text-[#9c5700] ring-[#f5c573]",
    cool: "bg-[#e6f0ff] text-[#2056b2] ring-[#8eb4ff]",
    success: "bg-[#e7f8ec] text-[#23744b] ring-[#8ad2a8]",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
