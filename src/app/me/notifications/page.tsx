import { LegacyRedirect } from "@/components/legacy-redirect";

export default function NotificationsRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LegacyRedirect path="/me/notifications" searchParams={searchParams} />;
}
