import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { assertPublicHttpsTarget, probeRemoteMedia } from "./import-safety";

type SourceKind = "OFFICIAL_REFERENCE" | "OPENVERSE_FAN_ART";

interface SourceEntry {
  id: string;
  characterSlug: string;
  creatorOrOfficialAccount: string;
  creatorOrOfficialAccountUrl: string | null;
  originalPage: string | null;
  sourceKind: string;
}

interface SourceManifest {
  entries: SourceEntry[];
}

interface ExpansionManifest {
  entries: Array<{
    id: string;
    characterSlug: string;
    sourcePageUrl: string;
    creatorName: string;
    creatorUrl: string | null;
    media: Array<{ url: string; label: string }>;
  }>;
}

interface ReviewCandidate {
  id: string;
  characterSlug: string;
  sourceKind: SourceKind;
  localPath: string;
  sourcePageUrl: string;
  sourceMediaUrl: string;
  creatorName: string | null;
  creatorUrl: string | null;
  licenseName: string | null;
  licenseUrl: string | null;
  permissionStatus: "UNVERIFIED";
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  sfwReview: "UNREVIEWED" | "SAFE" | "REJECTED";
  adEligible: false;
  retrievedAt: string;
  sourceSha256: string;
  normalizedSha256: string;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
  notes: string;
}

interface ReviewFailure {
  characterSlug: string;
  sourceKind: SourceKind;
  sourcePageUrl: string;
  reason: string;
}

interface ReviewManifest {
  schemaVersion: 1;
  generatedAt: string;
  warning: string;
  candidates: ReviewCandidate[];
  failures: ReviewFailure[];
}

interface OpenverseResult {
  id?: string;
  title?: string;
  creator?: string;
  creator_url?: string;
  foreign_landing_url?: string;
  thumbnail?: string;
  url?: string;
  license?: string;
  license_url?: string;
  mature?: boolean;
}

const projectRoot = process.cwd();
const outputRoot = path.join(projectRoot, "review-media");
const candidateRoot = path.join(outputRoot, "candidates");
const sourceManifestPath = path.join(projectRoot, "content", "media-sources.json");
const expansionManifestPath = path.join(projectRoot, "content", "media-expansion-sources.json");
const reviewManifestPath = path.join(outputRoot, "review-manifest.json");
const htmlLimit = 3 * 1024 * 1024;
const imageLimit = 8 * 1024 * 1024;
const maxCharacters = Number(process.argv.find((argument) => argument.startsWith("--limit="))?.split("=")[1] ?? "24");
const maxOfficialPerSource = Math.min(6, Math.max(1, Number(process.argv.find((argument) => argument.startsWith("--per-source="))?.split("=")[1] ?? "3")));

function escapeHtml(value: string | null | undefined) {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decodeAttribute(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function attribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return decodeAttribute(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

async function fetchPublicHtml(sourceUrl: string) {
  let currentUrl = (await assertPublicHttpsTarget(sourceUrl)).toString();
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "ACG-Polymarket-Editorial-Review/1.0 (+local review inbox)",
        },
      });
    } finally {
      clearTimeout(timeout);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === 3) throw new Error("HTML source exceeded the redirect limit.");
      currentUrl = (await assertPublicHttpsTarget(new URL(location, currentUrl).toString())).toString();
      continue;
    }
    if (!response.ok) throw new Error(`Source page returned HTTP ${response.status}.`);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error(`Source page returned ${contentType || "an unknown MIME type"}, not HTML.`);
    }
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > htmlLimit) throw new Error("Source page is larger than the HTML review limit.");
    const html = await response.text();
    if (Buffer.byteLength(html) > htmlLimit) throw new Error("Source page is larger than the HTML review limit.");
    return { html, finalUrl: currentUrl };
  }
  throw new Error("Source page could not be reached.");
}

function extractOfficialImages(html: string, pageUrl: string, characterSlug: string) {
  const candidates = new Map<string, number>();
  const tokens = characterSlug.split("-").filter((token) => token.length > 2);
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const property = (attribute(tag, "property") || attribute(tag, "name")).toLowerCase();
    if (!property.includes("image")) continue;
    const content = attribute(tag, "content");
    if (!content) continue;
    try { candidates.set(new URL(content, pageUrl).toString(), property === "og:image" ? 38 : 32); } catch { /* Ignore malformed source markup. */ }
  }
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const source = attribute(tag, "data-src") || attribute(tag, "data-original") || attribute(tag, "src");
    if (!source || source.startsWith("data:")) continue;
    try {
      const url = new URL(source, pageUrl).toString();
      const haystack = `${url} ${attribute(tag, "alt")} ${attribute(tag, "class")}`.toLowerCase();
      let score = 68 + tokens.filter((token) => haystack.includes(token)).length * 35;
      if (attribute(tag, "alt").trim()) score += 14;
      if (/chara|character|visual|main|stand|detail|contents|full/.test(haystack)) score += 30;
      if (/logo|icon|banner|header|footer|loading|button|btn|share|sns/.test(haystack)) score -= 110;
      candidates.set(url, Math.max(score, candidates.get(url) ?? -100));
    } catch { /* Ignore malformed source markup. */ }
  }
  return [...candidates.entries()]
    .filter(([url]) => url.startsWith("https://"))
    .sort((left, right) => right[1] - left[1])
    .map(([url]) => url);
}

async function findOpenverseCandidate(characterSlug: string) {
  const query = characterSlug.replaceAll("-", " ");
  const endpoint = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(`${query} character fan art`)}&page_size=10&mature=false`;
  const { html: payload } = await fetchPublicJson(endpoint);
  const data = JSON.parse(payload) as { results?: OpenverseResult[] };
  return data.results?.find((entry) => !entry.mature && (entry.thumbnail ?? entry.url)?.startsWith("https://")) ?? null;
}

async function fetchPublicJson(sourceUrl: string) {
  const target = await assertPublicHttpsTarget(sourceUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(target, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "ACG-Polymarket-Editorial-Review/1.0" },
    });
    if (!response.ok) throw new Error(`Openverse returned HTTP ${response.status}.`);
    const payload = await response.text();
    if (Buffer.byteLength(payload) > htmlLimit) throw new Error("Openverse response exceeded the review limit.");
    return { html: payload };
  } finally {
    clearTimeout(timeout);
  }
}

async function saveCandidate(input: {
  characterSlug: string;
  sourceKind: SourceKind;
  imageUrl: string;
  sourcePageUrl: string;
  creatorName: string | null;
  creatorUrl: string | null;
  licenseName: string | null;
  licenseUrl: string | null;
  notes: string;
  previous?: ReviewCandidate;
}) {
  const probe = await probeRemoteMedia(input.imageUrl, { maxBytes: imageLimit });
  const normalized = await sharp(probe.bytes, { animated: false })
    .rotate()
    .resize({ width: 1400, height: 1800, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88, effort: 4 })
    .toBuffer();
  const metadata = await sharp(normalized).metadata();
  if ((metadata.width ?? 0) < 240 || (metadata.height ?? 0) < 240) throw new Error("Candidate is too small for visual review.");
  const normalizedSha256 = createHash("sha256").update(normalized).digest("hex");
  const id = createHash("sha256").update(`${input.characterSlug}:${probe.finalUrl}`).digest("hex").slice(0, 16);
  const relativeDirectory = path.join("candidates", input.characterSlug);
  const relativePath = path.join(relativeDirectory, `${input.sourceKind.toLowerCase()}-${normalizedSha256.slice(0, 10)}.webp`).replaceAll("\\", "/");
  await mkdir(path.join(outputRoot, relativeDirectory), { recursive: true });
  await writeFile(path.join(outputRoot, relativePath), normalized);
  return {
    id,
    characterSlug: input.characterSlug,
    sourceKind: input.sourceKind,
    localPath: relativePath,
    sourcePageUrl: input.sourcePageUrl,
    sourceMediaUrl: probe.finalUrl,
    creatorName: input.creatorName,
    creatorUrl: input.creatorUrl,
    licenseName: input.licenseName,
    licenseUrl: input.licenseUrl,
    permissionStatus: "UNVERIFIED",
    approvalStatus: input.previous?.approvalStatus ?? "PENDING",
    sfwReview: input.previous?.sfwReview ?? "UNREVIEWED",
    adEligible: false,
    retrievedAt: new Date().toISOString(),
    sourceSha256: probe.sha256,
    normalizedSha256,
    mimeType: "image/webp",
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    byteSize: normalized.byteLength,
    notes: input.notes,
  } satisfies ReviewCandidate;
}

async function mapLimit<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  }));
}

function renderContactSheet(manifest: ReviewManifest) {
  const cards = manifest.candidates.map((candidate) => `
    <article class="card" data-id="${escapeHtml(candidate.id)}" data-character="${escapeHtml(candidate.characterSlug)}" data-kind="${escapeHtml(candidate.sourceKind)}">
      <div class="image-wrap"><img src="${escapeHtml(candidate.localPath)}" alt="Review candidate for ${escapeHtml(candidate.characterSlug)}"></div>
      <div class="body"><div class="labels"><span>${escapeHtml(candidate.sourceKind.replaceAll("_", " "))}</span><span>UNVERIFIED</span><span>SFW UNREVIEWED</span></div>
      <h2>${escapeHtml(candidate.characterSlug.replaceAll("-", " "))}</h2>
      <p class="creator">${escapeHtml(candidate.creatorName ?? "Creator not supplied")}</p>
      <dl><dt>License signal</dt><dd>${escapeHtml(candidate.licenseName ?? "None recorded")}</dd><dt>Checksum</dt><dd><code>${escapeHtml(candidate.normalizedSha256.slice(0, 16))}</code></dd><dt>Size</dt><dd>${candidate.width} x ${candidate.height}</dd></dl>
      <p class="notes">${escapeHtml(candidate.notes)}</p>
      <div class="links"><a href="${escapeHtml(candidate.sourcePageUrl)}" target="_blank" rel="noreferrer">Open source page</a><a href="${escapeHtml(candidate.sourceMediaUrl)}" target="_blank" rel="noreferrer">Open media URL</a>${candidate.licenseUrl ? `<a href="${escapeHtml(candidate.licenseUrl)}" target="_blank" rel="noreferrer">License page</a>` : ""}</div>
      <div class="decision"><button type="button" data-decision="APPROVED">Approve candidate</button><button type="button" data-decision="REJECTED">Reject</button><output>Pending</output></div></div>
    </article>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ACG media review inbox</title><style>
    :root{--ink:#181713;--paper:#f3eddf;--red:#e64632;--gold:#efc958}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Trebuchet MS,Microsoft JhengHei,sans-serif;background-image:linear-gradient(#18171309 1px,transparent 1px),linear-gradient(90deg,#18171309 1px,transparent 1px);background-size:32px 32px}header{position:sticky;z-index:5;top:0;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:18px;border-bottom:2px solid var(--ink);padding:18px clamp(16px,4vw,52px);background:#fffaf0}h1{margin:0;font:700 clamp(25px,4vw,46px)/1 Georgia,serif;letter-spacing:-.04em}.warning{max-width:760px;margin:9px 0 0;color:#6c665e;font-size:13px;line-height:1.5}.toolbar{display:flex;gap:8px}.toolbar button,.decision button{border:1px solid var(--ink);padding:10px 13px;background:white;font-weight:800;box-shadow:3px 3px 0 var(--ink);cursor:pointer}.toolbar button:first-child,.decision button:first-child{background:var(--red);color:white}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:26px;padding:30px clamp(16px,4vw,52px) 70px}.card{border:1px solid var(--ink);background:#fffaf0;box-shadow:6px 6px 0 #18171322}.image-wrap{aspect-ratio:4/5;overflow:hidden;border-bottom:1px solid var(--ink);background:#ddd}.image-wrap img{width:100%;height:100%;object-fit:contain;background:#e7dfd1}.body{padding:16px}.labels{display:flex;flex-wrap:wrap;gap:6px}.labels span{border:1px solid #18171355;padding:4px 6px;background:#eee5d5;font-size:9px;font-weight:900;letter-spacing:.08em}.card h2{margin:16px 0 5px;font:700 27px/1 Georgia,serif;text-transform:capitalize}.creator{margin:0;color:#6b655d;font-size:12px}dl{display:grid;grid-template-columns:105px 1fr;gap:6px;margin:16px 0;font-size:11px}dt{font-weight:900;text-transform:uppercase}dd{margin:0;overflow:hidden;text-overflow:ellipsis}.notes{min-height:48px;color:#6b655d;font-size:11px;line-height:1.5}.links{display:flex;flex-wrap:wrap;gap:10px;border-top:1px solid #18171322;padding-top:12px}.links a{color:#9e2e24;font-size:11px;font-weight:900}.decision{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}.decision output{grid-column:1/-1;border-left:3px solid var(--gold);padding:7px 10px;background:#eee5d5;font-size:11px;font-weight:900}.card[data-state=APPROVED]{outline:5px solid #2d8260}.card[data-state=REJECTED]{opacity:.48;filter:grayscale(1)}@media(max-width:600px){header{position:static}.grid{grid-template-columns:1fr}}
  </style></head><body><header><div><h1>Media review inbox / ${manifest.candidates.length}</h1><p class="warning">Review-only copies. Nothing here is published, ad-eligible, or committed to Git. Verify the original page, creator, license, and SFW status before using any candidate.</p></div><div class="toolbar"><button id="export">Export decisions</button><button id="reset">Reset local decisions</button></div></header><main class="grid">${cards || "<p>No candidates were downloaded. Check review-manifest.json for failures.</p>"}</main><script>
  const key='acg-media-review-v1';const decisions=JSON.parse(localStorage.getItem(key)||'{}');
  function paint(card){const state=decisions[card.dataset.id]||'PENDING';card.dataset.state=state;card.querySelector('output').textContent=state;}
  document.querySelectorAll('.card').forEach(card=>{paint(card);card.querySelectorAll('[data-decision]').forEach(button=>button.addEventListener('click',()=>{decisions[card.dataset.id]=button.dataset.decision;localStorage.setItem(key,JSON.stringify(decisions));paint(card)}))});
  document.querySelector('#reset').addEventListener('click',()=>{localStorage.removeItem(key);Object.keys(decisions).forEach(key=>delete decisions[key]);document.querySelectorAll('.card').forEach(paint)});
  document.querySelector('#export').addEventListener('click',()=>{const payload={exportedAt:new Date().toISOString(),notice:'Editorial decisions only. Rights and SFW review are still required.',decisions};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='approval-decisions.json';link.click();URL.revokeObjectURL(link.href)});
  </script></body></html>`;
}

async function main() {
  await mkdir(candidateRoot, { recursive: true });
  const sourceManifest = JSON.parse(await readFile(sourceManifestPath, "utf8")) as SourceManifest;
  const sources = sourceManifest.entries.filter((entry) => entry.originalPage && !entry.originalPage.includes("openverse.org")).slice(0, maxCharacters);
  let previous: ReviewManifest | null = null;
  try { previous = JSON.parse(await readFile(reviewManifestPath, "utf8")) as ReviewManifest; } catch { previous = null; }
  const previousByUrl = new Map(previous?.candidates.map((candidate) => [candidate.sourceMediaUrl, candidate]) ?? []);
  const candidates: ReviewCandidate[] = [];
  const failures: ReviewFailure[] = [];

  await mapLimit(sources, 4, async (source) => {
    const sourcePageUrl = source.originalPage!;
    try {
      const page = await fetchPublicHtml(sourcePageUrl);
      const imageUrls = extractOfficialImages(page.html, page.finalUrl, source.characterSlug).slice(0, Math.max(12, maxOfficialPerSource * 6));
      if (!imageUrls.length) throw new Error("No public HTTPS image candidate was found in the source markup.");
      const saved: ReviewCandidate[] = [];
      const rejectedReasons: string[] = [];
      for (const imageUrl of imageUrls) {
        if (saved.length >= maxOfficialPerSource) break;
        try {
          const candidate = await saveCandidate({
            characterSlug: source.characterSlug,
            sourceKind: "OFFICIAL_REFERENCE",
            imageUrl,
            sourcePageUrl: page.finalUrl,
            creatorName: source.creatorOrOfficialAccount,
            creatorUrl: source.creatorOrOfficialAccountUrl,
            licenseName: null,
            licenseUrl: null,
            notes: "Public official-page candidate. No reuse permission was inferred; keep ad-disabled until separately cleared.",
            previous: previousByUrl.get(imageUrl),
          });
          if (!saved.some((entry) => entry.normalizedSha256 === candidate.normalizedSha256)) saved.push(candidate);
        } catch (error) {
          rejectedReasons.push(error instanceof Error ? error.message : String(error));
        }
      }
      if (!saved.length) throw new Error(`No safe raster candidate passed validation: ${[...new Set(rejectedReasons)].join("; ")}`);
      candidates.push(...saved);
    } catch (error) {
      failures.push({ characterSlug: source.characterSlug, sourceKind: "OFFICIAL_REFERENCE", sourcePageUrl, reason: error instanceof Error ? error.message : String(error) });
    }

    try {
      const openverse = await findOpenverseCandidate(source.characterSlug);
      if (!openverse) throw new Error("Openverse returned no HTTPS, non-mature candidate.");
      const imageUrl = openverse.thumbnail ?? openverse.url!;
      const landingUrl = openverse.foreign_landing_url ?? `https://openverse.org/image/${openverse.id ?? ""}`;
      candidates.push(await saveCandidate({
        characterSlug: source.characterSlug,
        sourceKind: "OPENVERSE_FAN_ART",
        imageUrl,
        sourcePageUrl: landingUrl,
        creatorName: openverse.creator ?? null,
        creatorUrl: openverse.creator_url ?? null,
        licenseName: openverse.license?.toUpperCase() ?? null,
        licenseUrl: openverse.license_url ?? null,
        notes: `Openverse search result${openverse.title ? `: ${openverse.title}` : ""}. Verify relevance and the license again on the original source page.`,
        previous: previousByUrl.get(imageUrl),
      }));
    } catch (error) {
      failures.push({ characterSlug: source.characterSlug, sourceKind: "OPENVERSE_FAN_ART", sourcePageUrl: "https://openverse.org/", reason: error instanceof Error ? error.message : String(error) });
    }
  });

  let expansionManifest: ExpansionManifest = { entries: [] };
  try {
    expansionManifest = JSON.parse(await readFile(expansionManifestPath, "utf8")) as ExpansionManifest;
  } catch {
    // The explicit expansion list is optional for projects that only use the base manifest.
  }
  await mapLimit(expansionManifest.entries, 3, async (source) => {
    for (const media of source.media) {
      try {
        candidates.push(await saveCandidate({
          characterSlug: source.characterSlug,
          sourceKind: "OFFICIAL_REFERENCE",
          imageUrl: media.url,
          sourcePageUrl: source.sourcePageUrl,
          creatorName: source.creatorName,
          creatorUrl: source.creatorUrl,
          licenseName: null,
          licenseUrl: null,
          notes: `${media.label}. Explicit public official-page candidate from ${source.id}; no reuse permission was inferred.`,
          previous: previousByUrl.get(media.url),
        }));
      } catch (error) {
        failures.push({
          characterSlug: source.characterSlug,
          sourceKind: "OFFICIAL_REFERENCE",
          sourcePageUrl: source.sourcePageUrl,
          reason: `${media.label}: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
  });

  const uniqueCandidates = [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()];
  uniqueCandidates.sort((left, right) => left.characterSlug.localeCompare(right.characterSlug)
    || left.sourceKind.localeCompare(right.sourceKind)
    || left.sourceMediaUrl.localeCompare(right.sourceMediaUrl));
  const manifest: ReviewManifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    warning: "Review-only local copies. Approval does not grant rights or publish an asset. Verify source, permission, attribution, SFW status, and ad eligibility in admin before use.",
    candidates: uniqueCandidates,
    failures,
  };
  await writeFile(reviewManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(path.join(outputRoot, "index.html"), renderContactSheet(manifest), "utf8");
  process.stdout.write(`Review inbox ready: ${uniqueCandidates.length} candidates, ${failures.length} unresolved.\nOpen ${path.join(outputRoot, "index.html")}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
