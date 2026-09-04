import { LegacyRedirect } from "@/components/legacy-redirect";

export default function PredictionsRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LegacyRedirect path="/predictions" searchParams={searchParams} />;
}
