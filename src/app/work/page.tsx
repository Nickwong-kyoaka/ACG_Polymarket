import { LegacyRedirect } from "@/components/legacy-redirect";

export default function LegacyWork({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LegacyRedirect path="/work" searchParams={searchParams} />;
}
