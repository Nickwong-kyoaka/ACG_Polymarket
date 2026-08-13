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
    <div className={`flex max-w-3xl flex-col gap-3 ${className ?? ""}`}>
      <p className={`exchange-kicker ${tone === "light" ? "text-[#ffcc66] before:bg-[#ffcc66]" : ""}`}>
        {eyebrow}
      </p>
      <h2 className={`font-display text-3xl leading-[1.05] sm:text-4xl lg:text-5xl ${tone === "light" ? "text-white" : "text-[#111827]"}`}>{title}</h2>
      <p className={`text-base leading-7 sm:text-lg ${tone === "light" ? "text-white/62" : "text-slate-600"}`}>{description}</p>
    </div>
  );
}
