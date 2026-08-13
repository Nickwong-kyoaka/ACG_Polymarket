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
        "exchange-panel",
        className,
      )}
    >
      {children}
    </div>
  );
}
