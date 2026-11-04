export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = "dark",
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <div className={`flex max-w-3xl flex-col gap-2 ${className ?? ""}`}>
      <p className={`exchange-kicker ${tone === "light" ? "!text-white/80" : ""}`}>
        {eyebrow}
      </p>
      <h2 className={`font-display text-2xl leading-snug sm:text-3xl ${tone === "light" ? "text-white" : "text-[#222733]"}`}>{title}</h2>
      <p className={`text-sm leading-7 sm:text-base ${tone === "light" ? "text-white/80" : "text-slate-600"}`}>{description}</p>
    </div>
  );
}
