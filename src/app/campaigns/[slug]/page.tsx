import { LegacyRedirect } from "@/components/legacy-redirect";
export default async function CampaignRedirect({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) { const { slug } = await params; return <LegacyRedirect path={`/campaigns/${slug}`} searchParams={searchParams} />; }
