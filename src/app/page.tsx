import { LegacyRedirect } from "@/components/legacy-redirect";

export default function LegacyHome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LegacyRedirect path="/" searchParams={searchParams} />;
}
