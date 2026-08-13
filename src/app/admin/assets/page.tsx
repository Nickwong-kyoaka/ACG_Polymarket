import { AdminAssetConsole } from "@/components/admin/admin-asset-console";
import { SectionHeading } from "@/components/ui/section-heading";
import { getAdminSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminAssetsPage() {
  const snapshot = await getAdminSnapshot();
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <SectionHeading eyebrow="Asset control" title="Every visual enters with provenance and a release state" description="Register approved storage objects, connect rights grants, and audit exactly which media is ready for the public catalog." />
      <AdminAssetConsole assets={snapshot.assets} characters={snapshot.characters} rightsGrants={snapshot.rightsGrants} />
    </div>
  );
}
