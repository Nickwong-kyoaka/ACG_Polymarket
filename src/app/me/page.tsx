import { LegacyRedirect } from "@/components/legacy-redirect";

export default function LegacyMe({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LegacyRedirect path="/me" searchParams={searchParams} />;
}
