import { AdminCommunityConsole } from "@/components/admin/admin-community-console";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCommunityAdminSnapshot } from "@/lib/catalog-community";

export const dynamic = "force-dynamic";

export default async function AdminCommunityPage() {
  const snapshot = await getCommunityAdminSnapshot();
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <SectionHeading
        eyebrow="Community desk"
        title="Help new creators find their footing"
        description="Review early posts and new media with clear source notes, then let trusted creators publish approved material smoothly."
      />
      <AdminCommunityConsole
        creatorCount={snapshot.creatorCount}
        probationCount={snapshot.probationCount}
        initialPosts={snapshot.posts}
      />
    </div>
  );
}
