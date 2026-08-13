import Link from "next/link";
import { ArrowUpRight, Database, FileHeart, Images, ShieldCheck, ShoppingBag, Sparkles, UsersRound } from "lucide-react";
import { AdminModerationQueue } from "@/components/admin/admin-moderation-queue";
import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import { getAdminSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

const quickLinks = [
  { href: "/admin/content", label: "Create character", detail: "Profiles, market copy, comfort cards", icon: FileHeart, color: "bg-[#ffe7f0] text-[#b4235a]" },
  { href: "/admin/imports", label: "Import metadata", detail: "Bangumi source and attribution ledger", icon: Database, color: "bg-[#e9f7ff] text-[#1659a9]" },
  { href: "/admin/assets", label: "Register asset", detail: "Rights gate and workflow inventory", icon: Images, color: "bg-[#f0ecff] text-[#5b3ebd]" },
  { href: "/admin/shop", label: "Publish cosmetic", detail: "Frames, themes, and wallpapers", icon: ShoppingBag, color: "bg-[#fff2c5] text-[#9c4300]" },
] as const;

export default async function AdminPage() {
  const snapshot = await getAdminSnapshot();
  const publishedAssets = snapshot.assets.filter((asset) => asset.workflowStatus === "PUBLISHED").length;
  const rightsChecked = snapshot.assets.filter((asset) => ["RIGHTS_CHECKED", "REVIEWED", "PUBLISHED"].includes(asset.workflowStatus)).length;
  const referencedCharacters = snapshot.characters.filter((character) => character.metadataOnly).length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <section className="relative overflow-hidden rounded-[2.25rem] bg-[#171126] p-6 text-white shadow-[0_35px_90px_-50px_rgba(23,17,38,0.9)] sm:p-9">
        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-[#ff3d7f]/35 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[#38c7ff]/25 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2"><Badge tone="warm">Admin command center</Badge><span className="text-xs font-black uppercase tracking-[0.2em] text-white/45">ACG Studio OS</span></div>
            <h1 className="mt-5 font-display text-4xl leading-tight sm:text-6xl">Publish affection,<br /><span className="text-[#ffe56b]">protect the source.</span></h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">Manage the character catalog, comfort rooms, licensed metadata, asset provenance, cosmetics, and community reports from one production desk.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl border border-white/10 bg-white/8 px-5 py-4"><p className="font-display text-3xl text-[#ffe56b]">{snapshot.characters.length}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Characters</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/8 px-5 py-4"><p className="font-display text-3xl text-[#38c7ff]">{snapshot.reports.length}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Reports</p></div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group rounded-[1.5rem] border border-[#171126]/10 bg-white/85 p-5 shadow-[0_20px_55px_-42px_rgba(23,17,38,0.65)] transition hover:-translate-y-1 hover:border-[#ff3d7f]/40">
              <div className="flex items-start justify-between gap-4"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.color}`}><Icon className="h-5 w-5" /></span><ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-[#ff3d7f]" /></div>
              <h2 className="mt-4 text-base font-black text-[#171126]">{item.label}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Surface className="p-6 sm:p-7">
          <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff3d7f]">Release pipeline</p><h2 className="mt-2 font-display text-3xl text-[#171126]">Asset readiness</h2></div><ShieldCheck className="h-8 w-8 text-[#38c7ff]" /></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#fff8ed] p-4"><p className="font-display text-3xl">{snapshot.assets.length}</p><p className="mt-1 text-xs font-bold text-slate-500">Registered</p></div>
            <div className="rounded-2xl bg-[#e9f7ff] p-4"><p className="font-display text-3xl text-[#1659a9]">{rightsChecked}</p><p className="mt-1 text-xs font-bold text-slate-500">Rights checked+</p></div>
            <div className="rounded-2xl bg-emerald-50 p-4"><p className="font-display text-3xl text-emerald-700">{publishedAssets}</p><p className="mt-1 text-xs font-bold text-slate-500">Published</p></div>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-[#38c7ff] via-[#7c5cff] to-[#ff3d7f]" style={{ width: `${snapshot.assets.length ? Math.max((publishedAssets / snapshot.assets.length) * 100, 4) : 0}%` }} /></div>
          <p className="mt-3 text-xs text-slate-500">{snapshot.assets.length ? Math.round((publishedAssets / snapshot.assets.length) * 100) : 0}% of registered assets are public-ready.</p>
        </Surface>
        <Surface className="p-6 sm:p-7">
          <div className="flex items-center gap-3"><UsersRound className="h-6 w-6 text-[#ff3d7f]" /><h2 className="font-display text-3xl text-[#171126]">Catalog signal</h2></div>
          <div className="mt-6 grid gap-3">
            <div className="flex items-center justify-between rounded-2xl bg-[#fff8ed] px-4 py-3 text-sm"><span className="font-bold text-slate-600">Original IP profiles</span><strong>{snapshot.characters.length - referencedCharacters}</strong></div>
            <div className="flex items-center justify-between rounded-2xl bg-[#fff8ed] px-4 py-3 text-sm"><span className="font-bold text-slate-600">Metadata-only references</span><strong>{referencedCharacters}</strong></div>
            <div className="flex items-center justify-between rounded-2xl bg-[#fff8ed] px-4 py-3 text-sm"><span className="font-bold text-slate-600">Attribution records</span><strong>{snapshot.sourceAttributions.length}</strong></div>
            <div className="flex items-center justify-between rounded-2xl bg-[#fff8ed] px-4 py-3 text-sm"><span className="font-bold text-slate-600">Live cosmetics</span><strong>{snapshot.shopItems.filter((item) => item.published).length}</strong></div>
          </div>
        </Surface>
      </div>

      <Surface className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-[#171126]/10 bg-gradient-to-r from-[#fff2c5] to-[#ffe7f0] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#b4235a]">Latest drafts</p><h2 className="mt-2 font-display text-3xl text-[#171126]">Character desk</h2></div>
          <Link href="/admin/content" className="inline-flex items-center gap-2 rounded-xl bg-[#171126] px-4 py-3 text-xs font-black text-white">Open editor <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-px bg-[#171126]/10 sm:grid-cols-2 lg:grid-cols-4">
          {snapshot.characters.slice(0, 4).map((character) => (
            <article key={character.id} className="bg-white/90 p-5"><div className="h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${character.accentFrom}, ${character.accentTo})` }} /><h3 className="mt-4 font-display text-xl text-[#171126]">{character.name}</h3><p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{character.rightsType} · {character.metadataOnly ? "metadata" : "full profile"}</p><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{character.summary}</p></article>
          ))}
          {snapshot.characters.length === 0 ? <div className="col-span-full bg-white/90 py-12 text-center text-sm text-slate-500"><Sparkles className="mx-auto mb-2 h-6 w-6" />Create the first character draft.</div> : null}
        </div>
      </Surface>

      <AdminModerationQueue reports={snapshot.reports} characters={snapshot.characters} />
    </div>
  );
}
