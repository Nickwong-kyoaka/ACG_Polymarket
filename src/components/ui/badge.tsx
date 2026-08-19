import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warm" | "cool" | "success";
}) {
  const tones = {
    neutral: "bg-[#fffaf0] text-slate-700 ring-black/25",
    warm: "bg-[#f2ca61] text-[#5f2b13] ring-black/25",
    cool: "bg-[#d6ece9] text-[#155d62] ring-black/25",
    success: "bg-[#dce9d8] text-[#285e42] ring-black/25",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.13em] ring-1",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
