import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { getAdminSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminAssetsPage() {
  const snapshot = await getAdminSnapshot();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
      <SectionHeading
        eyebrow="Admin assets"
        title="Asset source and publish safety"
        description="Assets can be AI-generated, user-provided, Bangumi metadata placeholders, or official references. Published assets keep rights/source/takedown metadata."
      />
      <div className="grid gap-4">
        {snapshot.assets.map((asset) => (
          <Surface key={asset.id} className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#db5d35]">
              {asset.kind} - {asset.workflowStatus} - {asset.sourceKind ?? "USER_PROVIDED"}
            </p>
            <h2 className="mt-3 font-display text-3xl text-slate-950">{asset.label}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Storage: {asset.storageKey}
              <br />
              Rights grant: {asset.rightsGrantId ?? "not linked"}
              <br />
              Source: {asset.sourceUrl ?? "not provided"}
            </p>
          </Surface>
        ))}
      </div>
    </div>
  );
}
