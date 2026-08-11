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
      <p className="inline-flex w-fit rounded-full border border-[#171126]/10 bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.28em] text-[#ff3d7f] shadow-[0_10px_30px_-24px_rgba(23,17,38,0.7)]">
        {eyebrow}
      </p>
      <h2 className="font-display text-3xl leading-tight text-[#171126] sm:text-4xl">{title}</h2>
      <p className="text-base leading-7 text-slate-600 sm:text-lg">{description}</p>
    </div>
  );
}
