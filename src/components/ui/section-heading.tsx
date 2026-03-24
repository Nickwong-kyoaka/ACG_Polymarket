export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#db5d35]">
        {eyebrow}
      </p>
      <h2 className="font-display text-3xl text-slate-950 sm:text-4xl">{title}</h2>
      <p className="text-base leading-7 text-slate-600 sm:text-lg">{description}</p>
    </div>
  );
}
