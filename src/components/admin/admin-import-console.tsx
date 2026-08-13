"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ExternalLink, FileInput, LibraryBig, LoaderCircle } from "lucide-react";
import type { BangumiImportSample } from "@/data/bangumi-samples";
import type { SourceAttribution } from "@/lib/types";
import {
  AdminField,
  AdminNoticeBar,
  AdminSectionCard,
  AdminSubmitButton,
  adminInputClass,
  type AdminNotice,
  postAdmin,
} from "@/components/admin/admin-ui";

const stableSampleNames: Record<string, string> = {
  "49131": "Date A Live / 約會大作戰",
  "summer-2026-bangumi": "Bangumi 2026 Summer Watchlist / 2026 夏季番",
};

function SampleQueue({ samples }: { samples: BangumiImportSample[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<AdminNotice>(null);

  async function importSubject(subjectId: string) {
    setPendingId(subjectId);
    setNotice(null);
    try {
      const result = await postAdmin<{ imported: number }>("/api/admin/bangumi/import-subject", {
        subjectId,
      });
      setNotice({
        tone: "success",
        message: `Imported ${result.imported} configured character record(s) from subject ${subjectId}.`,
      });
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Sample import failed.",
      });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <AdminSectionCard
      title="Curated subject queue"
      description="These beta imports are configured server-side. They create metadata records and preserve the source URL without downloading official character media."
      accent="cyan"
    >
      <div className="grid gap-4">
        {samples.map((sample) => (
          <article key={sample.subjectId} className="rounded-[1.5rem] border border-[#171126]/10 bg-[#fffaf4] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#171126] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                    Subject {sample.subjectId}
                  </span>
                  <span className="rounded-full bg-[#e9f7ff] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#1659a9]">
                    {sample.releaseSeason}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-2xl text-[#171126]">
                  {stableSampleNames[sample.subjectId] ?? sample.subjectTitle}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {sample.characters.length} configured character signal(s)
                  {typeof sample.score === "number" ? ` · Score snapshot ${sample.score}/100` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <a
                  href={sample.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#171126]/10 bg-white px-4 py-3 text-xs font-black text-slate-600 hover:border-[#38c7ff] hover:text-[#1659a9]"
                >
                  Source <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => importSubject(sample.subjectId)}
                  disabled={pendingId !== null}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#171126] px-4 py-3 text-xs font-black text-white transition hover:bg-[#7c5cff] disabled:opacity-45"
                >
                  {pendingId === sample.subjectId ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileInput className="h-4 w-4" />}
                  Import subject
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <AdminNoticeBar notice={notice} />
    </AdminSectionCard>
  );
}

function CustomImportForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<AdminNotice>(null);
  const [includesText, setIncludesText] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const importedText = String(data.get("importedText") ?? "").trim();
    setNotice(null);
    setPending(true);

    try {
      const result = await postAdmin<{ character: { name: string } }>("/api/admin/bangumi/import", {
        seriesTitle: String(data.get("seriesTitle")),
        characterName: String(data.get("characterName")),
        slug: String(data.get("slug")),
        summary: String(data.get("summary")),
        fandomPrompt: String(data.get("fandomPrompt")),
        tags: String(data.get("tags"))
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
        sourceUrl: String(data.get("sourceUrl")),
        sourceLabel: String(data.get("sourceLabel")),
        importedText: importedText || undefined,
        licenseName: String(data.get("licenseName") ?? "").trim() || undefined,
        attributionText: String(data.get("attributionText") ?? "").trim() || undefined,
        originalAuthor: String(data.get("originalAuthor") ?? "").trim() || undefined,
      });
      form.reset();
      setIncludesText(false);
      setNotice({ tone: "success", message: `${result.character.name} was imported with its audit trail.` });
      router.refresh();
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Import failed." });
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminSectionCard
      title="Metadata-first character import"
      description="Use this form when the subject is not in the sample queue. Imported text activates stricter attribution requirements automatically."
      accent="pink"
    >
      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Series title" required>
            <input name="seriesTitle" className={adminInputClass} minLength={2} required />
          </AdminField>
          <AdminField label="Character name" required>
            <input name="characterName" className={adminInputClass} minLength={2} required />
          </AdminField>
          <AdminField label="Stable slug" hint="Lowercase URL key" required>
            <input name="slug" className={adminInputClass} pattern="[a-z0-9-]+" placeholder="character-name" required />
          </AdminField>
          <AdminField label="Tags" hint="Comma separated" required>
            <input name="tags" className={adminInputClass} placeholder="seasonal, comfort, heroine" required />
          </AdminField>
          <AdminField label="Source label" required>
            <input name="sourceLabel" defaultValue="Bangumi" className={adminInputClass} required />
          </AdminField>
          <AdminField label="Source URL" required>
            <input name="sourceUrl" type="url" className={adminInputClass} placeholder="https://bangumi.tv/subject/..." required />
          </AdminField>
        </div>
        <AdminField label="Metadata summary" required>
          <textarea name="summary" rows={4} minLength={10} className={adminInputClass} required />
        </AdminField>
        <AdminField label="Positive fandom prompt" required>
          <textarea name="fandomPrompt" rows={3} minLength={10} className={adminInputClass} required />
        </AdminField>
        <label className="flex items-center gap-3 rounded-2xl border border-[#171126]/10 bg-[#fff8ed] p-4 text-sm font-black text-slate-700">
          <input
            type="checkbox"
            checked={includesText}
            onChange={(event) => setIncludesText(event.target.checked)}
            className="h-4 w-4 accent-[#ff3d7f]"
          />
          Include source text under its stated license
        </label>
        {includesText ? (
          <div className="grid gap-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 md:grid-cols-2">
            <AdminField label="License name" required>
              <input name="licenseName" defaultValue="CC BY-SA" className={adminInputClass} required />
            </AdminField>
            <AdminField label="Original author" required>
              <input name="originalAuthor" defaultValue="Bangumi contributors" className={adminInputClass} required />
            </AdminField>
            <AdminField label="Attribution statement" className="md:col-span-2" required>
              <textarea name="attributionText" rows={3} className={adminInputClass} required />
            </AdminField>
            <AdminField label="Imported text" className="md:col-span-2" required>
              <textarea name="importedText" rows={5} className={adminInputClass} required />
            </AdminField>
          </div>
        ) : null}
        <AdminNoticeBar notice={notice} />
        <AdminSubmitButton pending={pending}>Import metadata record</AdminSubmitButton>
      </form>
    </AdminSectionCard>
  );
}

export function AdminImportConsole({
  samples,
  attributions,
}: {
  samples: BangumiImportSample[];
  attributions: SourceAttribution[];
}) {
  return (
    <div className="grid gap-7">
      <SampleQueue samples={samples} />
      <CustomImportForm />
      <AdminSectionCard
        title="Attribution ledger"
        description="Recent source records retained with every metadata import. This is the audit trail shown before referenced content reaches publication."
        accent="gold"
      >
        <div className="overflow-x-auto rounded-2xl border border-[#171126]/10">
          <table className="min-w-full divide-y divide-[#171126]/10 text-left text-sm">
            <thead className="bg-[#171126] text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
              <tr>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">License</th>
                <th className="px-4 py-3">Attribution</th>
                <th className="px-4 py-3">Imported</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171126]/8 bg-white/75">
              {attributions.slice(0, 12).map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-4 font-black text-[#171126]">
                    <a href={entry.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-[#ff3d7f]">
                      {entry.sourceLabel} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{entry.licenseName}</td>
                  <td className="max-w-md px-4 py-4 text-slate-600">{entry.attributionText}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {new Date(entry.importedAt).toLocaleDateString("en-CA")}</span>
                  </td>
                </tr>
              ))}
              {attributions.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500"><LibraryBig className="mx-auto mb-2 h-6 w-6" />No attribution records yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminSectionCard>
    </div>
  );
}
