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
        "manga-panel rounded-[2rem] bg-white/90 shadow-[0_22px_80px_-44px_rgba(23,17,38,0.52)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
