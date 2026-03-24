import { cn } from "@/lib/utils";

export function Surface({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border border-black/10 bg-white/90 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}
