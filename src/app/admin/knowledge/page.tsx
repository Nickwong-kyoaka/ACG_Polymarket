import { AdminKnowledgeConsole } from "@/components/admin/admin-knowledge-console";
import { SectionHeading } from "@/components/ui/section-heading";
import { getKnowledgeAdminSnapshot } from "@/lib/catalog-community";

export const dynamic = "force-dynamic";

export default async function AdminKnowledgePage() {
  const snapshot = await getKnowledgeAdminSnapshot();
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <SectionHeading
        eyebrow="Knowledge desk"
        title="Review facts without flattening fandom"
        description="Keep sourced catalog facts, community interpretation, and market signals in separate, traceable layers."
      />
      <AdminKnowledgeConsole
        counts={snapshot.counts}
        initialProposals={snapshot.proposals}
        revisions={snapshot.revisions}
        snapshots={snapshot.recentSnapshots}
      />
    </div>
  );
}
