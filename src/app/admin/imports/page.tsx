import { AdminImportConsole } from "@/components/admin/admin-import-console";
import { SectionHeading } from "@/components/ui/section-heading";
import { bangumiImportSamples } from "@/data/bangumi-samples";
import { getAdminSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminImportsPage() {
  const snapshot = await getAdminSnapshot();
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <SectionHeading eyebrow="Import station" title="Bring seasonal metadata in with its source attached" description="Fetch a numeric Bangumi subject, retain its raw snapshot, and review staged catalog changes before publication. Imported summary text requires explicit attribution." />
      <AdminImportConsole samples={bangumiImportSamples} attributions={snapshot.sourceAttributions} />
    </div>
  );
}
