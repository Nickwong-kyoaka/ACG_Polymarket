"use client";

import { useEffect, useId, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import type { PublicLocale } from "@/components/acg-locale";

export type CharacterSection = { id: string; label: string; content: ReactNode; anchors?: string[] };
const changeEvent = "character-section-change";
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener("hashchange", callback);
  window.addEventListener(changeEvent, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("hashchange", callback);
    window.removeEventListener(changeEvent, callback);
  };
}

export function CharacterSections({ sections, initialTab = "overview", locale }: { sections: CharacterSection[]; initialTab?: string; locale: PublicLocale }) {
  const prefix = useId();
  const location = useSyncExternalStore(subscribe, () => `${window.location.search}${window.location.hash}`, () => `?tab=${initialTab}`);
  const url = new URL(location || "?", "https://character.invalid");
  let hash = url.hash.slice(1);
  try { hash = decodeURIComponent(hash); } catch { /* Ignore malformed external fragments. */ }
  const active = sections.find((section) => section.id === hash || section.anchors?.includes(hash))?.id
    ?? sections.find((section) => section.id === url.searchParams.get("tab"))?.id
    ?? sections[0]?.id;

  useEffect(() => {
    if (hash && sections.some((section) => section.id === hash || section.anchors?.includes(hash))) {
      document.getElementById(hash)?.scrollIntoView?.({ block: "start" });
    }
  }, [hash, sections]);

  function select(id: string) {
    const next = new URL(window.location.href);
    next.searchParams.set("tab", id);
    next.hash = id;
    window.history.pushState(null, "", `${next.pathname}${next.search}${next.hash}`);
    window.dispatchEvent(new Event(changeEvent));
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const next = event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 : (index + offset + sections.length) % sections.length;
    if (!offset && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    select(sections[next].id);
    document.getElementById(`${prefix}-tab-${sections[next].id}`)?.focus();
  }

  return <div className="character-sections min-w-0">
    <div role="tablist" aria-label={locale === "zh-Hant" ? "角色內容" : "Character sections"} className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-3">
      {sections.map((section, index) => <button key={section.id} type="button" role="tab" id={`${prefix}-tab-${section.id}`} aria-controls={section.id} aria-selected={active === section.id} tabIndex={active === section.id ? 0 : -1} onClick={() => select(section.id)} onKeyDown={(event) => navigate(event, index)} className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 ${active === section.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{section.label}</button>)}
    </div>
    {sections.map((section) => <div key={section.id} id={section.id} role="tabpanel" aria-labelledby={`${prefix}-tab-${section.id}`} hidden={active !== section.id} tabIndex={0} className="scroll-mt-24 py-6 focus-visible:outline-2 focus-visible:outline-offset-4">
      {active === section.id ? section.content : null}
    </div>)}
  </div>;
}
