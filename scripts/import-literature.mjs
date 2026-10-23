import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { format } from "prettier";
import curation from "../data/literature/curation.json" with { type: "json" };
import markers from "../data/references/soybean-root-nodule-2024.json" with { type: "json" };

// Default: fetch real public sources. --source-dir explicitly imports previously
// downloaded source bytes; it never silently substitutes cached or synthetic data.
const args = process.argv.slice(2);
if (
  args.length &&
  !(args.length === 2 && args[0] === "--source-dir" && args[1])
)
  throw new Error(
    "Usage: node scripts/import-literature.mjs [--source-dir PATH]",
  );
const sourceDir = resolve(args[1] ?? ".artifacts/literature");
const execute = promisify(execFile);
const sha = (value) => createHash("sha256").update(value).digest("hex");
const text = (html) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCodePoint(parseInt(n, 16)),
    )
    .replace(/&#([0-9]+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
const paragraph = (html, anchor) => {
  if (!/^[A-Za-z0-9_-]+$/.test(anchor))
    throw new Error("Invalid source anchor");
  const match = html.match(
    new RegExp(
      `<p\\b[^>]*\\bid=["']${anchor}["'][^>]*>([\\s\\S]*?)<\\/p>`,
      "i",
    ),
  );
  if (!match) throw new Error(`Source paragraph missing: ${anchor}`);
  return text(match[1]);
};
const sources = [];
const passages = [];
const sourceTexts = new Map();
await mkdir(sourceDir, { recursive: true });
const receiptPath = resolve(sourceDir, "retrieval-receipts.json");
const receipts = args.length
  ? JSON.parse(await readFile(receiptPath, "utf8"))
  : { version: 1, sources: {} };
if (receipts.version !== 1 || !receipts.sources)
  throw new Error("Source retrieval receipts are invalid");
for (const definition of curation.sources) {
  const path = resolve(sourceDir, definition.file);
  let raw;
  if (!args.length) {
    // curl is the explicit downloader, including the host's configured proxy.
    // No browser/challenge page is accepted as an article and no cache fallback.
    const downloaded = await execute(
      "curl",
      [
        "--fail",
        "--silent",
        "--show-error",
        "--location",
        "--max-time",
        "45",
        definition.retrievalUrl,
      ],
      { encoding: "buffer", maxBuffer: 6_000_000 },
    );
    raw = downloaded.stdout;
    if (raw.length > 6_000_000 || raw.length < 500)
      throw new Error(`Unexpected source length: ${definition.id}`);
  } else {
    raw = await readFile(path);
    const receipt = receipts.sources[definition.id];
    if (
      !receipt ||
      receipt.sourceSha256 !== sha(raw) ||
      receipt.retrievalUrl !== definition.retrievalUrl ||
      !/^\d{4}-\d{2}-\d{2}$/.test(receipt.retrievedAt)
    )
      throw new Error(
        `Source bytes do not match retrieval receipt: ${definition.id}`,
      );
  }
  const body = raw.toString("utf8");
  let abstract;
  if (definition.format === "crossref-abstract") {
    const record = JSON.parse(body).message;
    if (record.DOI.toLowerCase() !== definition.doi.toLowerCase())
      throw new Error(`Source DOI mismatch: ${definition.id}`);
    if (record.title?.[0] !== definition.title || !record.abstract)
      throw new Error(`Source metadata changed: ${definition.id}`);
    abstract = text(record.abstract);
  } else if (
    !body.includes(definition.doi) ||
    !text(body).includes(definition.title)
  ) {
    throw new Error(`Source identity changed: ${definition.id}`);
  }
  const definitions = definition.passages;
  const metadata = Object.fromEntries(
    Object.entries(definition).filter(
      ([key]) => !["file", "format", "passages"].includes(key),
    ),
  );
  const receipt = args.length
    ? receipts.sources[definition.id]
    : {
        retrievedAt: new Date().toISOString().slice(0, 10),
        retrievalUrl: definition.retrievalUrl,
        sourceSha256: sha(raw),
      };
  sources.push({
    ...metadata,
    retrievedAt: receipt.retrievedAt,
    sourceSha256: receipt.sourceSha256,
  });
  sourceTexts.set(definition.id, body);
  for (const recipe of definitions) {
    const evidence = abstract ?? paragraph(body, recipe.anchor);
    if (recipe.contains.some((fragment) => !evidence.includes(fragment)))
      throw new Error(`Reviewed evidence changed: ${recipe.id}`);
    const anchor = recipe.anchor;
    const fields = Object.fromEntries(
      Object.entries(recipe).filter(
        ([key]) => !["anchor", "contains"].includes(key),
      ),
    );
    passages.push({
      ...fields,
      sourceId: definition.id,
      evidenceSha256: sha(evidence),
      url:
        definition.format === "html"
          ? `${definition.url}#${anchor}`
          : definition.url,
    });
  }
  if (!args.length) {
    await writeFile(path, raw);
    receipts.sources[definition.id] = receipt;
  }
  console.log(
    JSON.stringify({
      event: "literature.source_verified",
      id: definition.id,
      bytes: raw.length,
      sha256: sha(raw),
    }),
  );
}

// Revalidate every factual association against its real Methods paragraph.
// No orthology guesses, malformed-ID repairs or new biological labels.
const markerHtml = sourceTexts.get(markers.source.id);
if (
  !markerHtml ||
  !paragraph(markerHtml, "p0220").includes(markers.source.genomeVersion)
)
  throw new Error("Marker build is not supported by the retrieved source");
for (const record of markers.records) {
  const anchor = new URL(record.sourceUrl).hash.slice(1);
  const evidence = paragraph(markerHtml, anchor);
  const groups = [
    ...evidence.matchAll(/the ([a-z/ ]+) marker genes were (.*?)(?=;| \(see)/g),
  ];
  const group = groups.find((match) => match[1] === record.sourceLabel);
  if (!group || !group[2].match(/Glyma\.\d+G\d+/g)?.includes(record.geneId))
    throw new Error(`Marker association not found: ${record.id}`);
  passages.push({
    id: `marker:${record.id}`,
    sourceId: markers.source.id,
    title: `${record.geneId}: ${record.cellType} in ${record.tissue}`,
    summary: `${record.geneId} is listed for ${record.cellType} annotation in ${record.tissue} using Molecular Cartography. Sample context: ${record.stage}.`,
    kind: "marker_association",
    speciesId: markers.source.speciesId,
    tissues: [record.tissue],
    genomeVersion: markers.source.genomeVersion,
    genes: [record.geneId],
    locator: `Methods, cell type annotation using Molecular Cartography; paragraph ${anchor}`,
    url: record.sourceUrl,
    evidenceSha256: sha(evidence),
    excerpt: null,
    applicability:
      "Published marker use in this study, not a prediction or specificity guarantee for another sample. Shared markers may occur under several cell types.",
    keywords: [
      record.geneId,
      record.cellType,
      record.tissue,
      "markers",
      "annotation",
      "evidence",
    ],
  });
}
if (new Set(passages.map((p) => p.id)).size !== passages.length)
  throw new Error("Duplicate passage identity");
const corpus = {
  version: 1,
  corpusVersion: curation.version,
  sources,
  passages,
};
if (!args.length)
  await writeFile(receiptPath, `${JSON.stringify(receipts, null, 2)}\n`);
const output = resolve("data/literature/soybean-v1.json");
await writeFile(
  `${output}.tmp`,
  await format(JSON.stringify(corpus), { parser: "json" }),
);
await rename(`${output}.tmp`, output);
console.log(
  JSON.stringify({
    event: "literature.corpus_committed",
    sources: sources.length,
    passages: passages.length,
    geneAssociations: markers.records.length,
    sha256: sha(JSON.stringify(corpus)),
  }),
);
