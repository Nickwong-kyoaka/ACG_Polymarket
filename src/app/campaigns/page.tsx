import { LegacyRedirect } from "@/components/legacy-redirect";
export default function CampaignsRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { return <LegacyRedirect path="/campaigns" searchParams={searchParams} />; }
