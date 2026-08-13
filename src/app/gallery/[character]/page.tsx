import { LegacyRedirect } from "@/components/legacy-redirect";
export default async function GalleryCharacterRedirect({ params, searchParams }: { params: Promise<{ character: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) { const { character } = await params; return <LegacyRedirect path={`/gallery/${character}`} searchParams={searchParams} />; }
