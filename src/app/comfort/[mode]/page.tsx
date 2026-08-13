import { LegacyRedirect } from "@/components/legacy-redirect";

export default async function LegacyComfortMode({ params, searchParams }: { params: Promise<{ mode: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { mode } = await params;
  return <LegacyRedirect path={`/comfort/${mode}`} searchParams={searchParams} />;
}
