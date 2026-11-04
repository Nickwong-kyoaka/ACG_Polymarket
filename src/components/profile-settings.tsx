"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pick, type PublicLocale } from "@/components/acg-locale";
import { roomRequest } from "@/components/room-ui";
import type { Profile } from "@/lib/types";

export type EditableRoomProfile = Pick<Profile, "displayName" | "bio" | "holdingsVisibility" | "favoriteTags" | "pinnedCharacterIds">;

export function ProfileSettings({ profile, characters, locale }: { profile: EditableRoomProfile; characters: Array<{ id: string; name: string }>; locale: PublicLocale }) {
  const router = useRouter();
  const [name, setName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [visible, setVisible] = useState(profile.holdingsVisibility);
  const [tags, setTags] = useState(profile.favoriteTags.join(", "));
  const [pins, setPins] = useState(profile.pinnedCharacterIds);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const locked = useRef(false);

  function save(section: "profile" | "pins") {
    if (locked.current) return;
    const favoriteTags = [...new Set(tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))];
    if (section === "profile" && (name.trim().length < 2 || name.trim().length > 40 || bio.trim().length > 280 || favoriteTags.length > 12 || favoriteTags.some((tag) => tag.length > 30))) {
      setStatus(pick(locale, "Use 2–40 characters for your name, up to 280 for your bio, and up to 12 tags of 30 characters.", "名稱請用 2–40 字、簡介最多 280 字，最多 12 個標籤，每個最多 30 字。"));
      return;
    }
    locked.current = true;
    startTransition(async () => {
      setStatus(null);
      try {
        await roomRequest(section === "profile" ? "/api/me/profile" : "/api/me/pins", {
          method: section === "profile" ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(section === "profile" ? { displayName: name.trim(), bio: bio.trim(), holdingsVisibility: visible, favoriteTags } : { characterIds: pins }),
        });
        setStatus(section === "profile" ? pick(locale, "Profile and privacy saved.", "個人資料與隱私已儲存。") : pick(locale, "Pinned favorites saved in this order.", "置頂本命已按此順序儲存。"));
        router.refresh();
      } catch (error) { setStatus(error instanceof Error ? error.message : pick(locale, "Network error. Your edits are still here; try again.", "網絡錯誤，編輯內容已保留，請重試。")); }
      finally { locked.current = false; }
    });
  }

  function move(index: number, direction: number) {
    setPins((previous) => { const next = [...previous]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next; });
  }

  return <section id="profile-settings" className="exchange-panel grid gap-7 p-6 sm:p-8">
    <div><p className="exchange-kicker">{pick(locale, "ROOM SETTINGS", "房間設定")}</p><h2 className="mt-3 font-display text-3xl">{pick(locale, "Make the room yours", "整理自己的房間")}</h2></div>
    <form onSubmit={(event) => { event.preventDefault(); save("profile"); }} className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold">{pick(locale, "Display name", "顯示名稱")}<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={40} required className="rounded-lg border border-black/15 bg-white p-3" /></label>
      <label className="grid gap-2 text-sm font-bold">{pick(locale, "Bio", "簡介")}<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} rows={3} className="rounded-lg border border-black/15 bg-white p-3" /></label>
      <label className="grid gap-2 text-sm font-bold">{pick(locale, "Favorite tags (comma separated)", "喜愛標籤（以逗號分隔）")}<input value={tags} onChange={(event) => setTags(event.target.value)} className="rounded-lg border border-black/15 bg-white p-3" /></label>
      <label className="flex items-start gap-3 text-sm font-bold"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} className="mt-1" />{pick(locale, "Show my support holdings in my public room", "在公開房間展示應援收藏")}</label>
      <p className="text-xs leading-6 text-slate-500">{pick(locale, "Your wallet stays private. Pins are always public, even when holdings are hidden.", "錢包保持私密。即使隱藏應援收藏，置頂本命仍會公開。")}</p>
      <button disabled={pending} className="exchange-button-primary w-fit disabled:opacity-50">{pick(locale, "Save profile & privacy", "儲存資料與隱私")}</button>
    </form>
    <div className="grid gap-4 border-t border-black/10 pt-6"><h3 className="font-display text-2xl">{pick(locale, "Pinned favorites", "置頂本命")} ({pins.length}/6)</h3>
      <ol className="grid gap-3">{pins.map((id, index) => { const name = characters.find((character) => character.id === id)?.name ?? id; return <li key={id} className="flex flex-wrap items-center gap-2 rounded-lg bg-[#f5f1e8] p-3"><span className="mr-auto text-sm font-bold">{index + 1}. {name}</span><button type="button" disabled={pending || index === 0} onClick={() => move(index, -1)} aria-label={pick(locale, `Move ${name} up`, `上移${name}`)} className="p-2 disabled:opacity-30">↑</button><button type="button" disabled={pending || index === pins.length - 1} onClick={() => move(index, 1)} aria-label={pick(locale, `Move ${name} down`, `下移${name}`)} className="p-2 disabled:opacity-30">↓</button><button type="button" disabled={pending} onClick={() => setPins(pins.filter((pin) => pin !== id))} className="p-2 text-xs font-bold">{pick(locale, "Remove", "移除")}</button></li>; })}</ol>
      <label className="grid gap-2 text-sm font-bold">{pick(locale, "Add a favorite", "新增本命")}<select value="" disabled={pending || pins.length >= 6} onChange={(event) => { if (event.target.value) setPins([...pins, event.target.value]); }} className="rounded-lg border border-black/15 bg-white p-3"><option value="">{pick(locale, "Choose a character", "選擇角色")}</option>{characters.filter((character) => !pins.includes(character.id)).map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label>
      <button type="button" disabled={pending} onClick={() => save("pins")} className="exchange-button-primary w-fit disabled:opacity-50">{pick(locale, "Save pins", "儲存置頂本命")}</button>
    </div>
    {status ? <p role="status" className="text-sm leading-7 text-slate-600">{status}</p> : null}
  </section>;
}
