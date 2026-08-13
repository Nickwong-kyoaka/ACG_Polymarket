import { LegacyRedirect } from "@/components/legacy-redirect";

export default function LegacyMarket({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LegacyRedirect path="/market" searchParams={searchParams} />;
}
