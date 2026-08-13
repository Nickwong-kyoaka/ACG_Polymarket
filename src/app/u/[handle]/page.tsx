import { LegacyRedirect } from "@/components/legacy-redirect";

export default async function LegacyProfile({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { handle } = await params;
  return <LegacyRedirect path={`/u/${handle}`} searchParams={searchParams} />;
}
