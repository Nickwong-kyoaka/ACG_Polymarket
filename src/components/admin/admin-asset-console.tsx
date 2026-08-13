"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, ExternalLink, FileWarning, Filter, ShieldCheck } from "lucide-react";
import type {
  AssetSourceKind,
  AssetWorkflowStatus,
  Character,
  CharacterAsset,
  RightsGrant,
} from "@/lib/types";
import {
  AdminField,
  AdminNoticeBar,
  AdminSectionCard,
  AdminSubmitButton,
  adminInputClass,
  type AdminNotice,
  postAdmin,
} from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

const workflow: AssetWorkflowStatus[] = [
  "UPLOADED",
  "NORMALIZED",
  "TAGGED",
  "RIGHTS_CHECKED",
  "REVIEWED",
  "PUBLISHED",
  "PULLED",
];

const sourceKinds: AssetSourceKind[] = [
  "PLATFORM_ORIGINAL",
  "AI_GENERATED",
  "USER_PROVIDED",
  "FAN_ART",
  "OPEN_LICENSE",
  "BANGUMI_METADATA",
  "OFFICIAL_REFERENCE",
];

function emptyAsUndefined(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function AssetIntake({
  characters,
  rightsGrants,
}: {
  characters: Character[];
  rightsGrants: RightsGrant[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<AdminNotice>(null);
  const [sourceKind, setSourceKind] = useState<AssetSourceKind>("AI_GENERATED");
  const [status] = useState<AssetWorkflowStatus>("UPLOADED");
  const [rightsGrantId, setRightsGrantId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [attribution, setAttribution] = useState("");
  const [takedownContact, setTakedownContact] = useState("");
  const [licenseName, setLicenseName] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiModel, setAiModel] = useState("");

  const checks = useMemo(() => {
    const wantsPublish = status === "PUBLISHED";
    return [
      { label: "Storage key and descriptive alt text", ready: true },
      {
        label: "Rights grant linked before publication",
        ready: !wantsPublish || Boolean(rightsGrantId),
      },
      {
        label: "Bangumi source URL and attribution preserved",
        ready:
          sourceKind !== "BANGUMI_METADATA" ||
          (Boolean(sourceUrl) && Boolean(attribution) && Boolean(licenseName)),
      },
      {
        label: "Official-reference takedown contact recorded",
        ready: sourceKind !== "OFFICIAL_REFERENCE" || Boolean(takedownContact),
      },
      {
        label: "AI prompt or model provenance recorded",
        ready: sourceKind !== "AI_GENERATED" || Boolean(aiPrompt) || Boolean(aiModel),
      },
    ];
  }, [aiModel, aiPrompt, attribution, licenseName, rightsGrantId, sourceKind, sourceUrl, status, takedownContact]);
  const publishReady = checks.every((check) => check.ready);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setNotice(null);

    if (!publishReady) {
      setNotice({ tone: "error", message: "Complete the highlighted source and rights checks before saving this workflow state." });
      return;
    }

    setPending(true);
    try {
      const result = await postAdmin<{ asset: CharacterAsset }>("/api/admin/assets", {
        characterId: emptyAsUndefined(data.get("characterId")),
        kind: String(data.get("kind")),
        label: String(data.get("label")),
        storageKey: String(data.get("storageKey")),
        altText: String(data.get("altText")),
        zhAltText: String(data.get("zhAltText")),
        workflowStatus: status,
        rightsGrantId: rightsGrantId || undefined,
        sourceKind,
        sourceUrl: sourceUrl || undefined,
        attributionText: attribution || undefined,
        takedownContact: takedownContact || undefined,
        sourceLabel: emptyAsUndefined(data.get("sourceLabel")),
        licenseName: licenseName || undefined,
        publicUrl: emptyAsUndefined(data.get("publicUrl")),
        mimeType: emptyAsUndefined(data.get("mimeType")),
        byteSize: Number(data.get("byteSize")) || undefined,
        aiPrompt: aiPrompt || undefined,
        aiModel: aiModel || undefined,
        permissionStatus: String(data.get("permissionStatus")),
        contentRating: String(data.get("contentRating")),
        creatorName: emptyAsUndefined(data.get("creatorName")),
        creatorUrl: emptyAsUndefined(data.get("creatorUrl")),
        licenseUrl: emptyAsUndefined(data.get("licenseUrl")),
        permissionEvidence: emptyAsUndefined(data.get("permissionEvidence")),
        retrievedAt: emptyAsUndefined(data.get("retrievedAt")) ? new Date(String(data.get("retrievedAt"))).toISOString() : undefined,
        riskAcknowledged: data.get("riskAcknowledged") === "true",
        primaryPriority: Number(data.get("primaryPriority")) || 0,
      });
      form.reset();
      setSourceKind("AI_GENERATED");
      setRightsGrantId("");
      setSourceUrl("");
      setAttribution("");
      setTakedownContact("");
      setLicenseName("");
      setAiPrompt("");
      setAiModel("");
      setNotice({ tone: "success", message: `${result.asset.label} entered the asset workflow.` });
      router.refresh();
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Asset intake failed." });
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminSectionCard
      title="Asset intake & rights gate"
      description="Register media already stored in approved local or S3-compatible storage. This API records metadata; it does not upload or copy the file itself."
      accent="pink"
    >
      <form onSubmit={submit} className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Character" hint="Optional">
            <select name="characterId" className={adminInputClass} defaultValue="">
              <option value="">Global cosmetic asset</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>{character.name}</option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Asset kind" required>
            <select name="kind" className={adminInputClass} defaultValue="HERO">
              <option value="HERO">Hero visual</option>
              <option value="CARD">Market card</option>
              <option value="THUMB">Thumbnail</option>
              <option value="WALLPAPER">Wallpaper</option>
              <option value="AVATAR_FRAME">Avatar frame</option>
              <option value="PROFILE_THEME">Profile theme</option>
              <option value="VOICE">Voice clip</option>
              <option value="ASMR">ASMR track</option>
              <option value="COMIC">Comic package</option>
            </select>
          </AdminField>
          <AdminField label="Label" required>
            <input name="label" className={adminInputClass} minLength={2} placeholder="Moonlit comfort hero v1" required />
          </AdminField>
          <AdminField label="Storage key" hint="Path or object key" required>
            <input name="storageKey" className={adminInputClass} placeholder="assets/characters/..." required />
          </AdminField>
          <AdminField label="Source type" required>
            <select value={sourceKind} onChange={(event) => setSourceKind(event.target.value as AssetSourceKind)} className={adminInputClass}>
              {sourceKinds.map((kind) => <option key={kind} value={kind}>{kind.replaceAll("_", " ")}</option>)}
            </select>
          </AdminField>
          <AdminField label="Source label" hint="Creator, model, or archive">
            <input name="sourceLabel" className={adminInputClass} placeholder="Studio original / Bangumi / model name" />
          </AdminField>
          <AdminField label="Permission status" required><select name="permissionStatus" className={adminInputClass} defaultValue="UNVERIFIED"><option value="UNVERIFIED">Unverified</option><option value="CREATOR_GRANTED">Creator granted</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option></select></AdminField>
          <AdminField label="Content review" required><select name="contentRating" className={adminInputClass} defaultValue="SFW"><option value="SFW">Strict SFW</option><option value="UNRATED">Not reviewed</option><option value="SUGGESTIVE">Suggestive (cannot publish)</option><option value="NSFW">NSFW (cannot publish)</option></select></AdminField>
          <AdminField label="Creator name"><input name="creatorName" className={adminInputClass} /></AdminField>
          <AdminField label="Creator URL"><input name="creatorUrl" type="url" className={adminInputClass} /></AdminField>
          <AdminField label="License URL"><input name="licenseUrl" type="url" className={adminInputClass} /></AdminField>
          <AdminField label="Retrieved at"><input name="retrievedAt" type="datetime-local" className={adminInputClass} /></AdminField>
          <AdminField label="Primary priority"><input name="primaryPriority" type="number" min={0} max={1000} defaultValue={0} className={adminInputClass} /></AdminField>
          <AdminField label="Workflow state" hint="Every asset begins at intake" required>
            <input value="UPLOADED" readOnly className={adminInputClass} />
          </AdminField>
          <AdminField label="Rights grant" hint="Optional at intake; required where applicable before publish">
            <select value={rightsGrantId} onChange={(event) => setRightsGrantId(event.target.value)} className={adminInputClass}>
              <option value="">Not linked</option>
              {rightsGrants.map((grant) => (
                <option key={grant.id} value={grant.id}>{grant.licensor} · {grant.contractReference}</option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Source URL" hint={sourceKind === "BANGUMI_METADATA" ? "Required" : "Recommended"}>
            <input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} className={adminInputClass} placeholder="https://..." />
          </AdminField>
          <AdminField label="Public delivery URL" hint="Optional CDN URL">
            <input name="publicUrl" type="url" className={adminInputClass} placeholder="https://cdn.example.com/..." />
          </AdminField>
          <AdminField label="License name" hint={sourceKind === "BANGUMI_METADATA" ? "Required" : "When applicable"}>
            <input value={licenseName} onChange={(event) => setLicenseName(event.target.value)} className={adminInputClass} placeholder="CC BY-SA / original / licensed" />
          </AdminField>
          <AdminField label="Takedown contact" hint={sourceKind === "OFFICIAL_REFERENCE" ? "Required" : "Recommended"}>
            <input value={takedownContact} onChange={(event) => setTakedownContact(event.target.value)} className={adminInputClass} placeholder="rights@example.com" />
          </AdminField>
          <AdminField label="MIME type" hint="Optional">
            <input name="mimeType" className={adminInputClass} placeholder="image/webp, audio/mpeg..." />
          </AdminField>
          <AdminField label="File size" hint="Bytes, optional">
            <input name="byteSize" type="number" min={1} className={adminInputClass} />
          </AdminField>
        </div>
        <AdminField label="Accessible alt text" hint="Minimum 8 characters" required>
          <textarea name="altText" rows={3} minLength={8} className={adminInputClass} required />
        </AdminField>
        <AdminField label="Traditional Chinese alt text" hint="Required before publication" required><textarea name="zhAltText" rows={3} minLength={4} className={adminInputClass} required /></AdminField>
        <AdminField label="Permission evidence / review note"><textarea name="permissionEvidence" rows={3} className={adminInputClass} /></AdminField>
        <AdminField
          label="Attribution statement"
          hint={sourceKind === "BANGUMI_METADATA" ? "Required" : "Recommended"}
        >
          <textarea
            value={attribution}
            onChange={(event) => setAttribution(event.target.value)}
            rows={3}
            className={adminInputClass}
            placeholder="Creator, source, reuse terms, and required credit..."
          />
        </AdminField>
        {sourceKind === "AI_GENERATED" ? (
          <div className="grid gap-4 rounded-[1.5rem] border border-violet-200 bg-violet-50 p-5 md:grid-cols-2">
            <AdminField label="Generation model" hint="Model or service">
              <input value={aiModel} onChange={(event) => setAiModel(event.target.value)} className={adminInputClass} placeholder="Model name and version" />
            </AdminField>
            <AdminField label="Prompt provenance" hint="Prompt family is enough">
              <textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} rows={3} className={adminInputClass} placeholder="Original comfort heroine, palette, composition..." />
            </AdminField>
          </div>
        ) : null}
        <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-xs font-bold leading-6 text-amber-900"><input name="riskAcknowledged" value="true" type="checkbox" className="mt-1" />I acknowledge the source risk. This is required before an unverified asset can be published, and real ads remain disabled on its pages.</label>
        <div className="rounded-[1.5rem] border border-[#171126]/10 bg-[#fff8ed] p-5">
          <div className="flex items-center gap-2 text-sm font-black text-[#171126]"><ShieldCheck className="h-5 w-5 text-[#ff3d7f]" /> Release checklist</div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {checks.map((check) => (
              <div key={check.label} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold", check.ready ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700")}>
                {check.ready ? <Check className="h-4 w-4" /> : <FileWarning className="h-4 w-4" />}
                {check.label}
              </div>
            ))}
          </div>
        </div>
        <AdminNoticeBar notice={notice} />
        <AdminSubmitButton pending={pending} disabled={!publishReady}>Register asset</AdminSubmitButton>
      </form>
    </AdminSectionCard>
  );
}

function AssetInventory({ assets }: { assets: CharacterAsset[] }) {
  const router = useRouter();
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<AdminNotice>(null);
  const filtered = assets.filter(
    (asset) =>
      (sourceFilter === "ALL" || asset.sourceKind === sourceFilter) &&
      (statusFilter === "ALL" || asset.workflowStatus === statusFilter),
  );

  async function moveAsset(asset: CharacterAsset, workflowStatus: AssetWorkflowStatus) {
    setPendingId(asset.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/assets/${asset.id}/workflow`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workflowStatus }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Workflow update failed.");
      }
      setNotice({ tone: "success", message: `${asset.label} moved to ${workflowStatus.replaceAll("_", " ")}.` });
      router.refresh();
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Workflow update failed." });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <AdminSectionCard
      title="Workflow inventory"
      description="Inspect every revision, advance one required review step at a time, or pull public media immediately."
      accent="cyan"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500"><Filter className="h-4 w-4" /> Filters</span>
        <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className={`${adminInputClass} w-auto min-w-44 py-2`}>
          <option value="ALL">All sources</option>
          {sourceKinds.map((kind) => <option key={kind} value={kind}>{kind.replaceAll("_", " ")}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={`${adminInputClass} w-auto min-w-44 py-2`}>
          <option value="ALL">All workflow states</option>
          {workflow.map((step) => <option key={step} value={step}>{step.replaceAll("_", " ")}</option>)}
        </select>
        <span className="ml-auto text-xs font-bold text-slate-400">{filtered.length} of {assets.length} assets</span>
      </div>
      <AdminNoticeBar notice={notice} />
      <div className="overflow-x-auto rounded-2xl border border-[#171126]/10">
        <table className="min-w-full divide-y divide-[#171126]/10 text-left text-sm">
          <thead className="bg-[#171126] text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
            <tr><th className="px-4 py-3">Asset</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Workflow</th><th className="px-4 py-3">Rights</th><th className="px-4 py-3">Storage</th><th className="px-4 py-3">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-[#171126]/8 bg-white/75">
            {filtered.map((asset) => {
              const currentIndex = workflow.indexOf(asset.workflowStatus);
              const nextStatus = currentIndex >= 0 && currentIndex < 5 ? workflow[currentIndex + 1] : undefined;
              return (
              <tr key={asset.id}>
                <td className="px-4 py-4"><p className="font-black text-[#171126]">{asset.label}</p><p className="mt-1 text-xs text-slate-400">{asset.kind.replaceAll("_", " ")} · v{asset.version}</p></td>
                <td className="px-4 py-4 text-xs font-black text-slate-600">{(asset.sourceKind ?? "USER_PROVIDED").replaceAll("_", " ")}{asset.sourceUrl ? <a href={asset.sourceUrl} target="_blank" rel="noreferrer" aria-label="Open source" className="ml-2 inline-flex text-[#1659a9]"><ExternalLink className="h-3.5 w-3.5" /></a> : null}</td>
                <td className="px-4 py-4"><span className={cn("rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]", asset.workflowStatus === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : asset.workflowStatus === "PULLED" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800")}>{asset.workflowStatus.replaceAll("_", " ")}</span></td>
                <td className="px-4 py-4 text-xs text-slate-600">{asset.rightsGrantId ? <span className="inline-flex items-center gap-1 font-bold text-emerald-700"><ShieldCheck className="h-4 w-4" /> Linked</span> : "Not linked"}</td>
                <td className="max-w-xs truncate px-4 py-4 font-mono text-xs text-slate-500" title={asset.storageKey}>{asset.publicUrl ? <a href={asset.publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-[#1659a9]">Open media <ExternalLink className="h-3.5 w-3.5" /></a> : asset.storageKey}</td>
                <td className="px-4 py-4"><div className="flex gap-2">{nextStatus ? <button type="button" disabled={pendingId === asset.id} onClick={() => moveAsset(asset, nextStatus)} className="rounded-lg bg-[#171126] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-50">{nextStatus.replaceAll("_", " ")}</button> : null}{asset.workflowStatus !== "PULLED" ? <button type="button" disabled={pendingId === asset.id} onClick={() => moveAsset(asset, "PULLED")} className="rounded-lg border border-rose-200 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-rose-700 disabled:opacity-50">Pull</button> : null}</div></td>
              </tr>
              );
            })}
            {filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No assets match these filters.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </AdminSectionCard>
  );
}

function RemoteMediaImport({ characters }: { characters: Character[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<AdminNotice>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setNotice(null);
    try {
      const result = await postAdmin<{ asset: { id: string; workflowStatus: string } }>("/api/admin/assets/import-url", {
        characterId: String(data.get("characterId")), directMediaUrl: String(data.get("directMediaUrl")), sourcePageUrl: String(data.get("sourcePageUrl")),
        sourceKind: String(data.get("sourceKind")), permissionStatus: String(data.get("permissionStatus")), creatorName: emptyAsUndefined(data.get("creatorName")), creatorUrl: emptyAsUndefined(data.get("creatorUrl")),
        licenseName: emptyAsUndefined(data.get("licenseName")), licenseUrl: emptyAsUndefined(data.get("licenseUrl")), permissionEvidence: emptyAsUndefined(data.get("permissionEvidence")),
        label: String(data.get("label")), altTextEn: String(data.get("altTextEn")), altTextZhHant: String(data.get("altTextZhHant")), riskAcknowledged: data.get("riskAcknowledged") === "true",
      });
      setNotice({ tone: "success", message: `Imported ${result.asset.id}. Normalized derivatives are ready for final publication review.` });
      form.reset();
      router.refresh();
    } catch (error) { setNotice({ tone: "error", message: error instanceof Error ? error.message : "Remote media import failed." }); }
    finally { setPending(false); }
  }

  return <AdminSectionCard title="Secure URL import" description="Fetch a public HTTPS image, block private-network targets, verify MIME and size, strip metadata, create WebP variants, and upload them to S3. Import never publishes automatically." accent="cyan">
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <AdminField label="Character" required><select name="characterId" required className={adminInputClass} defaultValue=""><option value="" disabled>Select character</option>{characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select></AdminField>
        <AdminField label="Source lane" required><select name="sourceKind" required className={adminInputClass} defaultValue="FAN_ART"><option value="FAN_ART">Fan art</option><option value="OPEN_LICENSE">Open license</option><option value="OFFICIAL_REFERENCE">Official reference</option><option value="USER_PROVIDED">User provided</option></select></AdminField>
        <AdminField label="Direct image URL" hint="HTTPS only" required><input name="directMediaUrl" type="url" pattern="https://.*" required className={adminInputClass} /></AdminField>
        <AdminField label="Original source page" hint="Creator or official post" required><input name="sourcePageUrl" type="url" pattern="https://.*" required className={adminInputClass} /></AdminField>
        <AdminField label="Permission signal" required><select name="permissionStatus" className={adminInputClass} defaultValue="UNVERIFIED"><option value="UNVERIFIED">Unverified</option><option value="CREATOR_GRANTED">Creator granted</option><option value="VERIFIED">Verified</option></select></AdminField>
        <AdminField label="Creator name"><input name="creatorName" className={adminInputClass} /></AdminField>
        <AdminField label="Creator URL"><input name="creatorUrl" type="url" className={adminInputClass} /></AdminField>
        <AdminField label="License name"><input name="licenseName" className={adminInputClass} /></AdminField>
        <AdminField label="License URL"><input name="licenseUrl" type="url" className={adminInputClass} /></AdminField>
        <AdminField label="Internal label" required><input name="label" minLength={2} required className={adminInputClass} /></AdminField>
      </div>
      <AdminField label="English alt text" required><textarea name="altTextEn" minLength={8} required rows={2} className={adminInputClass} /></AdminField>
      <AdminField label="Traditional Chinese alt text" required><textarea name="altTextZhHant" minLength={4} required rows={2} className={adminInputClass} /></AdminField>
      <AdminField label="Permission evidence / review note"><textarea name="permissionEvidence" rows={3} className={adminInputClass} /></AdminField>
      <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-xs font-bold leading-6 text-amber-900"><input name="riskAcknowledged" value="true" type="checkbox" required className="mt-1" />I reviewed the source and acknowledge that unverified media disables real ads and may be pulled immediately.</label>
      <AdminNoticeBar notice={notice} /><AdminSubmitButton pending={pending}>Probe, normalize & upload</AdminSubmitButton>
    </form>
  </AdminSectionCard>;
}

export function AdminAssetConsole({
  assets,
  characters,
  rightsGrants,
}: {
  assets: CharacterAsset[];
  characters: Character[];
  rightsGrants: RightsGrant[];
}) {
  return <div className="grid gap-7"><RemoteMediaImport characters={characters} /><AssetIntake characters={characters} rightsGrants={rightsGrants} /><AssetInventory assets={assets} /></div>;
}
