"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookHeart, Languages, Sparkles, UsersRound } from "lucide-react";
import type { Character, ComfortMode, ShopItem } from "@/lib/types";
import {
  AdminField,
  AdminNoticeBar,
  AdminSectionCard,
  AdminSubmitButton,
  adminInputClass,
  type AdminNotice,
  postAdmin,
} from "@/components/admin/admin-ui";

function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function CharacterEditor({ seriesIds }: { seriesIds: string[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<AdminNotice>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setNotice(null);
    setPending(true);

    try {
      const result = await postAdmin<{ character: Character }>("/api/admin/characters", {
        seriesId: String(data.get("seriesId")),
        name: String(data.get("name")),
        title: String(data.get("title")),
        summary: String(data.get("summary")),
        fandomPrompt: String(data.get("fandomPrompt")),
        mood: String(data.get("mood")),
        zhName: String(data.get("zhName")),
        zhTitle: String(data.get("zhTitle")),
        zhSummary: String(data.get("zhSummary")),
        zhFandomPrompt: String(data.get("zhFandomPrompt")),
        zhMood: String(data.get("zhMood")),
        rightsType: String(data.get("rightsType")),
        metadataOnly: data.get("metadataOnly") === "on",
        basePrice: Number(data.get("basePrice")),
        priceStep: Number(data.get("priceStep")),
        unitsPerStep: Number(data.get("unitsPerStep")),
        tags: String(data.get("tags"))
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
        accentFrom: String(data.get("accentFrom")),
        accentTo: String(data.get("accentTo")),
      });
      form.reset();
      setNotice({ tone: "success", message: `${result.character.name} was added to the catalog.` });
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Character creation failed.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminSectionCard
      title="Create a support character"
      description="Create an original launch unit or a licensed metadata shell with complete independent English and Traditional Chinese copy."
      accent="pink"
    >
      <div className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-bold text-sky-800">
        <Languages className="h-4 w-4 shrink-0" />
        Both language editions are required before the character can enter review.
      </div>
      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Series ID" hint="Existing relation" required>
            <input name="seriesId" list="admin-series-ids" className={adminInputClass} required />
          </AdminField>
          <datalist id="admin-series-ids">
            {seriesIds.map((seriesId) => (
              <option key={seriesId} value={seriesId} />
            ))}
          </datalist>
          <AdminField label="Display name" required>
            <input name="name" className={adminInputClass} minLength={2} required />
          </AdminField>
          <AdminField label="Market title" required>
            <input name="title" className={adminInputClass} minLength={2} required />
          </AdminField>
          <AdminField label="Comfort mood" required>
            <input name="mood" className={adminInputClass} placeholder="Warm, focused, playful..." required />
          </AdminField>
          <AdminField label="繁中角色名稱" required>
            <input name="zhName" className={adminInputClass} minLength={2} required />
          </AdminField>
          <AdminField label="繁中應援稱號" required>
            <input name="zhTitle" className={adminInputClass} minLength={2} required />
          </AdminField>
          <AdminField label="繁中陪伴風格" required>
            <input name="zhMood" className={adminInputClass} minLength={1} required />
          </AdminField>
          <AdminField label="Rights model" required>
            <select name="rightsType" className={adminInputClass} defaultValue="ORIGINAL">
              <option value="ORIGINAL">Original IP</option>
              <option value="LICENSED">Licensed / referenced IP</option>
            </select>
          </AdminField>
          <AdminField label="Tags" hint="Comma separated" required>
            <input name="tags" className={adminInputClass} placeholder="healing, study, gentle" required />
          </AdminField>
          <AdminField label="Base price" hint="SUP" required>
            <input name="basePrice" type="number" min={1} defaultValue={15} className={adminInputClass} required />
          </AdminField>
          <AdminField label="Price step" required>
            <input name="priceStep" type="number" min={1} max={20} defaultValue={2} className={adminInputClass} required />
          </AdminField>
          <AdminField label="Units per step" required>
            <input name="unitsPerStep" type="number" min={10} max={500} defaultValue={100} className={adminInputClass} required />
          </AdminField>
          <AdminField label="Accent start" required>
            <input name="accentFrom" type="color" defaultValue="#ff3d7f" className="h-12 w-full rounded-2xl border border-[#171126]/12 bg-white p-2" required />
          </AdminField>
          <AdminField label="Accent end" required>
            <input name="accentTo" type="color" defaultValue="#38c7ff" className="h-12 w-full rounded-2xl border border-[#171126]/12 bg-white p-2" required />
          </AdminField>
        </div>
        <AdminField label="Profile summary" hint="Minimum 20 characters" required>
          <textarea name="summary" rows={4} minLength={20} className={adminInputClass} required />
        </AdminField>
        <AdminField label="Positive fandom prompt" required>
          <textarea name="fandomPrompt" rows={3} minLength={10} className={adminInputClass} required />
        </AdminField>
        <AdminField label="繁中角色簡介" hint="至少 10 個字" required>
          <textarea name="zhSummary" rows={4} minLength={10} className={adminInputClass} required />
        </AdminField>
        <AdminField label="繁中正向應援文案" required>
          <textarea name="zhFandomPrompt" rows={3} minLength={6} className={adminInputClass} required />
        </AdminField>
        <label className="flex items-start gap-3 rounded-2xl border border-[#171126]/10 bg-[#fff8ed] p-4 text-sm font-bold text-slate-700">
          <input name="metadataOnly" type="checkbox" className="mt-1 h-4 w-4 accent-[#ff3d7f]" />
          <span>
            Metadata-only listing
            <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">
              Use this for referenced IP until independently publishable character art is attached.
            </span>
          </span>
        </label>
        <AdminNoticeBar notice={notice} />
        <AdminSubmitButton pending={pending}>Create character draft</AdminSubmitButton>
      </form>
    </AdminSectionCard>
  );
}

function ComfortEditor({
  modes,
  characters,
  shopItems,
}: {
  modes: ComfortMode[];
  characters: Character[];
  shopItems: ShopItem[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<AdminNotice>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setNotice(null);
    setPending(true);

    try {
      const result = await postAdmin<{ content: { title: string } }>(
        "/api/admin/comfort-content",
        {
          modeSlug: String(data.get("modeSlug")),
          characterId: optional(data.get("characterId")),
          kind: String(data.get("kind")),
          title: String(data.get("title")),
          body: String(data.get("body")),
          mediaUrl: optional(data.get("mediaUrl")),
          sweetnessLevel: Number(data.get("sweetnessLevel")),
          unlockShopItemId: optional(data.get("unlockShopItemId")),
          published: data.get("published") === "on",
        },
      );
      form.reset();
      setNotice({ tone: "success", message: `${result.content.title} was saved to the comfort room.` });
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Comfort content creation failed.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminSectionCard
      title="Compose comfort content"
      description="Publish sweet-talk, voice, ASMR, comic, and wallpaper entries into one of the six healing rooms. Media URLs can point to approved object storage or local demo assets."
      accent="cyan"
    >
      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Comfort room" required>
            <select name="modeSlug" className={adminInputClass} required defaultValue="">
              <option value="" disabled>Select a room</option>
              {modes.map((mode) => (
                <option key={mode.id} value={mode.slug}>{mode.title} · {mode.slug}</option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Content type" required>
            <select name="kind" className={adminInputClass} defaultValue="SWEET_TALK">
              <option value="SWEET_TALK">Sweet-talk card</option>
              <option value="VOICE">Voice clip</option>
              <option value="ASMR">ASMR scene</option>
              <option value="COMIC">Comic panel</option>
              <option value="WALLPAPER">Wallpaper unlock</option>
            </select>
          </AdminField>
          <AdminField label="Character" hint="Optional">
            <select name="characterId" className={adminInputClass} defaultValue="">
              <option value="">Room-wide content</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>{character.name}</option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Sweetness level" hint="1-100">
            <input name="sweetnessLevel" type="range" min={1} max={100} defaultValue={82} className="h-12 w-full accent-[#ff3d7f]" />
          </AdminField>
          <AdminField label="Media URL" hint="Optional">
            <input name="mediaUrl" className={adminInputClass} placeholder="/assets/comfort/... or https://" />
          </AdminField>
          <AdminField label="Unlock reward" hint="Optional">
            <select name="unlockShopItemId" className={adminInputClass} defaultValue="">
              <option value="">No linked reward</option>
              {shopItems.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </AdminField>
        </div>
        <AdminField label="Card title" required>
          <input name="title" minLength={2} className={adminInputClass} required />
        </AdminField>
        <AdminField label="Dialogue / panel copy" hint="Minimum 10 characters" required>
          <textarea name="body" rows={5} minLength={10} className={adminInputClass} required />
        </AdminField>
        <label className="flex items-center gap-3 text-sm font-black text-slate-700">
          <input name="published" type="checkbox" defaultChecked className="h-4 w-4 accent-[#ff3d7f]" />
          Publish immediately to the selected comfort room
        </label>
        <AdminNoticeBar notice={notice} />
        <AdminSubmitButton pending={pending}>Save comfort content</AdminSubmitButton>
      </form>
    </AdminSectionCard>
  );
}

function CharacterWorkflow({ characters }: { characters: Character[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<AdminNotice>(null);
  const order = ["DRAFT", "RIGHTS_CHECKED", "REVIEWED", "PUBLISHED"] as const;

  async function move(character: Character, publishStatus: (typeof order)[number] | "ARCHIVED") {
    setPendingId(character.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/characters/${character.id}/workflow`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publishStatus }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Character review update failed.");
      setNotice({ tone: "success", message: `${character.name} moved to ${publishStatus.replaceAll("_", " ")}.` });
      router.refresh();
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Character review update failed." });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <AdminSectionCard title="Character release queue" description="Advance only after bilingual copy, source or rights data, and publishable media are complete." accent="cyan">
      <AdminNoticeBar notice={notice} />
      <div className="grid gap-3">
        {characters.map((character) => {
          const status = character.publishStatus ?? "DRAFT";
          const next = order[order.indexOf(status as (typeof order)[number]) + 1];
          return <div key={character.id} className="flex flex-col gap-3 rounded-2xl border border-[#171126]/10 bg-white/80 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="truncate font-black text-[#171126]">{character.name}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{status.replaceAll("_", " ")} · {character.rightsType}</p></div><div className="flex gap-2">{next ? <button type="button" disabled={pendingId === character.id} onClick={() => move(character, next)} className="rounded-xl bg-[#171126] px-3 py-2 text-xs font-black text-white disabled:opacity-50">Move to {next.replaceAll("_", " ")}</button> : null}{status !== "ARCHIVED" ? <button type="button" disabled={pendingId === character.id} onClick={() => move(character, "ARCHIVED")} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-black text-rose-700 disabled:opacity-50">Archive</button> : null}</div></div>;
        })}
      </div>
    </AdminSectionCard>
  );
}

export function AdminContentConsole({
  characters,
  modes,
  shopItems,
}: {
  characters: Character[];
  modes: ComfortMode[];
  shopItems: ShopItem[];
}) {
  const [tab, setTab] = useState<"character" | "comfort">("character");
  const seriesIds = [...new Set(characters.map((character) => character.seriesId))].sort();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-[#171126]/10 bg-white/70 p-2">
        <button
          type="button"
          onClick={() => setTab("character")}
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${tab === "character" ? "bg-[#171126] text-white" : "text-slate-600 hover:bg-[#fff2c5]"}`}
        >
          <UsersRound className="h-4 w-4" /> Character editor
        </button>
        <button
          type="button"
          onClick={() => setTab("comfort")}
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${tab === "comfort" ? "bg-[#171126] text-white" : "text-slate-600 hover:bg-[#e9f7ff]"}`}
        >
          <BookHeart className="h-4 w-4" /> Comfort composer
        </button>
        <div className="ml-auto hidden items-center gap-2 px-3 text-xs font-bold text-slate-400 md:flex">
          <Sparkles className="h-4 w-4 text-[#ff3d7f]" /> Positive fandom copy only
        </div>
      </div>
      {tab === "character" ? (
        <><CharacterEditor seriesIds={seriesIds} /><CharacterWorkflow characters={characters} /></>
      ) : (
        <ComfortEditor modes={modes} characters={characters} shopItems={shopItems} />
      )}
    </div>
  );
}
