import { AdminConsole } from "@/components/admin-console";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { getAdminSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const snapshot = getAdminSnapshot();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-12">
      <SectionHeading
        eyebrow="Admin"
        title="Official-only publishing, rights gating, and Bangumi-aware imports"
        description="This MVP admin surface is intentionally narrow: create safe original characters, import attribution-first metadata, and keep assets tied to rights grants before publish."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Surface className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Characters
          </p>
          <p className="mt-4 font-display text-5xl text-slate-950">
            {snapshot.characters.length}
          </p>
        </Surface>
        <Surface className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Assets
          </p>
          <p className="mt-4 font-display text-5xl text-slate-950">{snapshot.assets.length}</p>
        </Surface>
        <Surface className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Rights grants
          </p>
          <p className="mt-4 font-display text-5xl text-slate-950">
            {snapshot.rightsGrants.length}
          </p>
        </Surface>
      </div>

      <AdminConsole />

      <div className="grid gap-5 lg:grid-cols-2">
        <Surface className="p-6">
          <h2 className="font-display text-3xl text-slate-950">Moderation hooks</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Reports currently in queue: {snapshot.reports.length}. This is where future OCR, NSFW,
            and takedown automation can connect without changing the public product contract.
          </p>
        </Surface>
        <Surface className="p-6">
          <h2 className="font-display text-3xl text-slate-950">Attribution records</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Bangumi-compatible imports stored: {snapshot.sourceAttributions.length}. Imported text is
            blocked from publish if source, attribution, or license markers are missing.
          </p>
        </Surface>
      </div>
    </div>
  );
}
