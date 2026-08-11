import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { listComfortModes } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const modes = await listComfortModes();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
      <SectionHeading
        eyebrow="Admin content"
        title="Comfort copy, voice slots, ASMR placeholders, and comic panels"
        description="This beta page documents the admin content surface. Use the API to add sweet-talk cards and media placeholders without changing market rules."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {modes.map((mode) => (
          <Surface key={mode.id} className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#db5d35]">
              /comfort/{mode.slug}
            </p>
            <h2 className="mt-3 font-display text-3xl text-slate-950">{mode.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{mode.description}</p>
            <Link
              href={`/comfort/${mode.slug}`}
              className="mt-5 inline-flex rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#db5d35] hover:text-[#db5d35]"
            >
              Preview mode
            </Link>
          </Surface>
        ))}
      </div>
    </div>
  );
}
