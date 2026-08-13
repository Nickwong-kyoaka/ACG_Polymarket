import { LegacyRedirect } from "@/components/legacy-redirect";

export default function LegacyRules({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LegacyRedirect path="/help/market-rules" searchParams={searchParams} />;
}
