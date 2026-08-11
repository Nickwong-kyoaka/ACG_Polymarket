import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warm" | "cool" | "success";
}) {
  const tones = {
    neutral: "bg-white/75 text-slate-700 ring-black/10",
    warm: "bg-[#fff2c5] text-[#9c4300] ring-[#ffbd5a]",
    cool: "bg-[#e9f7ff] text-[#1659a9] ring-[#7bd6ff]",
    success: "bg-[#e7f8ec] text-[#23744b] ring-[#8ad2a8]",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ring-1 sticker-shadow",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
