"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AdminConsole() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function importBangumi() {
    const response = await fetch("/api/admin/bangumi/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seriesTitle: "Bangumi Demo Series",
        characterName: "Archive Supporter",
        slug: `archive-supporter-${Date.now()}`,
        summary:
          "A demo metadata-only entry imported through the Bangumi-safe pipeline with preserved attribution.",
        fandomPrompt: "Support this entry if you want to test metadata-first catalog imports.",
        tags: ["metadata", "archive", "demo"],
        sourceUrl: "https://bgm.tv/dev",
        sourceLabel: "Bangumi Archive",
        importedText:
          "This imported note shows how CC BY-SA text can be preserved with attribution and source tracking.",
        licenseName: "CC BY-SA",
        attributionText: "Metadata adapted from Bangumi with attribution preserved.",
        originalAuthor: "Bangumi contributors",
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error ?? "Bangumi import failed.");
      return;
    }

    setStatus(`Imported ${payload.character.name}.`);
    startTransition(() => router.refresh());
  }

  async function createOriginalCharacter() {
    const response = await fetch("/api/admin/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seriesId: "series-starlit",
        name: `Nova Pulse ${Date.now().toString().slice(-4)}`,
        title: "Original limited launch unit",
        summary:
          "A freshly drafted launch character created from the admin console to prove the official-only publishing flow.",
        fandomPrompt:
          "Support this unit if you want a fast path to testing admin-created original content.",
        mood: "Focused",
        rightsType: "ORIGINAL",
        basePrice: 17,
        tags: ["launch", "original", "test"],
        accentFrom: "#6f5cff",
        accentTo: "#c7a9ff",
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error ?? "Character creation failed.");
      return;
    }

    setStatus(`Created ${payload.character.name}.`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid gap-4 rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.5)]">
      <h3 className="font-display text-3xl text-slate-950">Admin quick actions</h3>
      <p className="text-sm leading-7 text-slate-600">
        These demo buttons exercise the same APIs that a future richer admin interface would use.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={createOriginalCharacter}
          className="rounded-full bg-[#db5d35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c14a24] disabled:opacity-60"
        >
          Create original character
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={importBangumi}
          className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#db5d35] hover:text-[#db5d35] disabled:opacity-60"
        >
          Run Bangumi import
        </button>
      </div>
      {status ? <p className="text-sm font-medium text-[#23744b]">{status}</p> : null}
    </div>
  );
}
