import { LegacyRedirect } from "@/components/legacy-redirect";
export default function GalleryRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { return <LegacyRedirect path="/gallery" searchParams={searchParams} />; }
