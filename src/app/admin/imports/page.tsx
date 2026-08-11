import { bangumiImportSamples } from "@/data/bangumi-samples";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";

export const dynamic = "force-dynamic";

export default function AdminImportsPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
      <SectionHeading
        eyebrow="Admin imports"
        title="Bangumi sample import queue"
        description="Configured samples are metadata-only. They carry source URLs and attribution markers, while media remains admin-uploaded or AI-generated placeholders."
      />
      <div className="grid gap-5">
        {bangumiImportSamples.map((sample) => (
          <Surface key={sample.subjectId} className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#db5d35]">
              Subject {sample.subjectId} - {sample.releaseSeason}
            </p>
            <h2 className="mt-3 font-display text-3xl text-slate-950">{sample.subjectTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Source: {sample.sourceUrl}
              <br />
              Sample characters: {sample.characters.map((entry) => entry.name).join(", ")}
            </p>
          </Surface>
        ))}
      </div>
    </div>
  );
}
