import { AdminTakedownConsole } from "@/components/admin/admin-takedown-console";
import { SectionHeading } from "@/components/ui/section-heading";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTakedownsPage() {
  const requests = await prisma.takedownRequest.findMany({ where: { status: { in: ["OPEN", "REVIEWING"] } }, include: { asset: { select: { label: true } } }, orderBy: { createdAt: "asc" } });
  return <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12"><SectionHeading eyebrow="Safety operations" title="Fast removal with a permanent audit trail" description="Every source badge links here. Unverified media is pulled on intake; reviewed cases stay traceable." /><AdminTakedownConsole requests={requests.map((request) => ({ id: request.id, assetId: request.assetId, assetLabel: request.asset.label, requesterName: request.requesterName, requesterEmail: request.requesterEmail, reason: request.reason, evidenceUrl: request.evidenceUrl, status: request.status, createdAt: request.createdAt.toISOString() }))} /></div>;
}
