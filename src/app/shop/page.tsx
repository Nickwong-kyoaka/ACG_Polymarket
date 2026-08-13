import { LegacyRedirect } from "@/components/legacy-redirect";

export default function LegacyShop({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LegacyRedirect path="/shop" searchParams={searchParams} />;
}
