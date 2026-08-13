import { LegacyRedirect } from "@/components/legacy-redirect";
export default function SourcesRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { return <LegacyRedirect path="/sources" searchParams={searchParams} />; }
