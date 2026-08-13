import { AdminCampaignConsole } from "@/components/admin/admin-campaign-console";
import { SectionHeading } from "@/components/ui/section-heading";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage() {
  const campaigns = await prisma.supportCampaign.findMany({ include: { character: { select: { name: true } } }, orderBy: [{ status: "asc" }, { startsAt: "desc" }] });
  return <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12"><SectionHeading eyebrow="Campaign control" title="Shape shared milestones, never rivalries" description="Publish, archive, and reconcile communal support goals from the production desk." /><AdminCampaignConsole campaigns={campaigns.map((campaign) => ({ id: campaign.id, slug: campaign.slug, status: campaign.status, title: campaign.title, characterName: campaign.character.name, currentUnits: campaign.currentUnits, goalUnits: campaign.goalUnits }))} /></div>;
}
