import { LegacyRedirect } from "@/components/legacy-redirect";

export default function MyPredictionsRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LegacyRedirect path="/me/predictions" searchParams={searchParams} />;
}
