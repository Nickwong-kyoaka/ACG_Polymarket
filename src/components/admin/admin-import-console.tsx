"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ExternalLink, LibraryBig } from "lucide-react";
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

function LiveSubjectImport({ samples }: { samples: BangumiImportSample[] }) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState("");
  const [pending, setPending] = useState(false);
  const [includeSummary, setIncludeSummary] = useState(false);
  const [notice, setNotice] = useState<AdminNotice>(null);
  const [result, setResult] = useState<{ seriesId: string; proposalId: string | null; snapshot: { id: string; checksum: string }; warnings: string[]; episodes: { count: number; total: number } | null } | null>(null);

  async function importSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setNotice(null);
    setResult(null);
    try {
      const imported = await postAdmin<NonNullable<typeof result>>("/api/admin/bangumi/import-subject", {
        subjectId: subjectId.trim(),
        seriesId: String(data.get("seriesId") ?? "").trim() || undefined,
        includeEpisodes: data.get("includeEpisodes") === "on",
        includeSummary,
        ...(includeSummary ? { licenseName: String(data.get("licenseName")), attributionText: String(data.get("attributionText")), originalAuthor: String(data.get("originalAuthor")) } : {}),
      });
      setResult(imported);
      setNotice({
        tone: "success",
        message: imported.proposalId ? "Raw evidence saved. Differences are staged for the knowledge desk; existing catalog fields were not overwritten." : "Raw evidence saved. No catalog differences need review.",
      });
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Bangumi import failed.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminSectionCard
      title="Live Bangumi subject intake"
      description="Fetch any numeric subject ID from Bangumi, preserve raw evidence, and stage sourced changes for review. Metadata-only by default; no images, episodes, or translations are auto-published."
      accent="cyan"
    >
      <form onSubmit={importSubject} className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2"><AdminField label="Numeric subject ID" required><input value={subjectId} onChange={(event) => setSubjectId(event.target.value)} inputMode="numeric" pattern="[1-9][0-9]{0,14}" placeholder="49131" required className={adminInputClass} /></AdminField><AdminField label="Existing series ID (optional)" hint="Leave blank to match its Bangumi source or create a metadata shell."><input name="seriesId" className={adminInputClass} /></AdminField></div>
        <div className="flex flex-wrap gap-2">{samples.filter((sample) => /^[1-9][0-9]*$/.test(sample.subjectId)).map((sample) => <button key={sample.subjectId} type="button" onClick={() => setSubjectId(sample.subjectId)} className="rounded-xl border px-3 py-2 text-xs font-bold">Use example ID {sample.subjectId}</button>)}</div>
        <label className="flex gap-2 text-sm"><input type="checkbox" name="includeEpisodes" />Snapshot first episode page (up to 100; evidence only)</label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={includeSummary} onChange={(event) => setIncludeSummary(event.target.checked)} />Propose original summary text with explicit license and attribution</label>
        {includeSummary ? <div className="grid gap-4 rounded-xl bg-amber-50 p-4"><AdminField label="License name" required><input name="licenseName" maxLength={120} required className={adminInputClass} /></AdminField><AdminField label="Original author" required><input name="originalAuthor" maxLength={180} required className={adminInputClass} /></AdminField><AdminField label="Attribution statement" required><textarea name="attributionText" minLength={8} maxLength={1000} required className={adminInputClass} /></AdminField><p className="text-xs">The original-language name and summary are not English or Traditional Chinese translations. Rights are verified by the reviewer before approval.</p></div> : null}
        <AdminSubmitButton pending={pending}>Fetch and stage for review</AdminSubmitButton>
      </form>
      <AdminNoticeBar notice={notice} />
      {result ? <div className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm"><p>Snapshot: <code>{result.snapshot.id}</code></p><p className="break-all font-mono text-xs">SHA-256: {result.snapshot.checksum}</p><p>Series: <code>{result.seriesId}</code></p>{result.proposalId ? <Link href="/admin/knowledge" className="font-bold underline">Review proposal {result.proposalId} at the knowledge desk</Link> : null}{result.episodes ? <p>Episode evidence: {result.episodes.count} of {result.episodes.total}; not published.</p> : null}{result.warnings.map((warning) => <p key={warning} className="text-amber-800">{warning}</p>)}</div> : null}
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
      <LiveSubjectImport samples={samples} />
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
