import { AdminContentConsole } from "@/components/admin/admin-content-console";
import { SectionHeading } from "@/components/ui/section-heading";
import { getAdminSnapshot, listComfortModes } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const [snapshot, modes] = await Promise.all([getAdminSnapshot(), listComfortModes()]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <SectionHeading eyebrow="Content studio" title="Characters, affection copy, and healing-room scenes" description="Build market-ready profiles and publish positive character moments through the APIs already connected to the catalog." />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#171126]/10 bg-white/80 p-4"><p className="font-display text-3xl text-[#ff3d7f]">{snapshot.characters.length}</p><p className="text-xs font-bold text-slate-500">Character profiles</p></div>
        <div className="rounded-2xl border border-[#171126]/10 bg-white/80 p-4"><p className="font-display text-3xl text-[#38c7ff]">{modes.length}</p><p className="text-xs font-bold text-slate-500">Comfort rooms</p></div>
        <div className="rounded-2xl border border-[#171126]/10 bg-white/80 p-4"><p className="font-display text-3xl text-[#7c5cff]">{snapshot.shopItems.length}</p><p className="text-xs font-bold text-slate-500">Possible unlocks</p></div>
      </div>
      <AdminContentConsole characters={snapshot.characters} modes={modes} shopItems={snapshot.shopItems} />
    </div>
  );
}
