import { LegacyRedirect } from "@/components/legacy-redirect";

export default function LegacyOnboarding({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LegacyRedirect path="/onboarding" searchParams={searchParams} />;
}
