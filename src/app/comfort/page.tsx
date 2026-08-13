import { LegacyRedirect } from "@/components/legacy-redirect";

export default function LegacyComfort({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LegacyRedirect path="/comfort" searchParams={searchParams} />;
}
