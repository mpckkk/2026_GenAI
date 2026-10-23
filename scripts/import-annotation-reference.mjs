import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { format } from "prettier";

const execute = promisify(execFile);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const args = process.argv.slice(2);
if (args.length && !(args.length === 2 && args[0] === "--source-dir"))
  throw new Error(
    "Usage: node scripts/import-annotation-reference.mjs [--source-dir DIRECTORY]",
  );
const directory = resolve(args[1] ?? ".artifacts/annotation");
await mkdir(directory, { recursive: true });
const definitions = {
  markers: {
    file: "atlas-table-s2.xlsx",
    url: "https://ars.els-cdn.com/content/image/1-s2.0-S009286742401273X-mmc2.xlsx",
    sha256: "18de89ddb0a729738e061df52f1966b952ecc0d03fa86243f500d5775233a616",
    bytes: 517637,
  },
  benchmark: {
    file: "atlas-table-s1.xlsx",
    url: "https://ars.els-cdn.com/content/image/1-s2.0-S009286742401273X-mmc1.xlsx",
    sha256: "83f86cdeda3b566968ec84f6caf7be4ee133e5e445b1d16845b79ebbff6d7287",
    bytes: 41762874,
  },
};
const extracted = {};
for (const [kind, source] of Object.entries(definitions)) {
  const filename = resolve(directory, source.file);
  const raw = args.length
    ? await readFile(filename)
    : (
        await execute(
          "curl",
          [
            "--fail",
            "--silent",
            "--show-error",
            "--location",
            "--max-time",
            "90",
            "--user-agent",
            "Mozilla/5.0",
            source.url,
          ],
          { encoding: "buffer", maxBuffer: 45_000_000 },
        )
      ).stdout;
  if (
    raw.length !== source.bytes ||
    sha(raw) !== source.sha256 ||
    raw.subarray(0, 4).toString("hex") !== "504b0304"
  )
    throw new Error(
      `Pinned publisher ${kind} workbook verification failed; no substitute reference is accepted`,
    );
  if (!args.length) await writeFile(filename, raw);
  const commandArgs = [
    "infra/science/extract-annotation-reference.py",
    kind,
    filename,
  ];
  if (kind === "benchmark")
    commandArgs.push(
      resolve(
        process.env.CELLORAS_DATASET_DIR ?? ".artifacts/scientific-data",
        "gse270392-root-rna-v1/source/cells.csv",
      ),
    );
  const { stdout } = await execute("python3", commandArgs, {
    maxBuffer: 2_000_000,
  });
  extracted[kind] = JSON.parse(stdout);
  console.log(
    JSON.stringify({
      stage: "source_verified",
      kind,
      bytes: raw.length,
      sha256: sha(raw),
    }),
  );
}

const reference = {
  version: 1,
  reference: {
    id: "soybean-root-atlas-literature-v1",
    version: "cell-2024.10.050-table-s2-root-v1",
    sha256: definitions.markers.sha256,
    title:
      "Soybean root literature-derived marker panel · Zhang et al., Table S2",
    url: definitions.markers.url,
    doi: "10.1016/j.cell.2024.10.050",
    speciesId: "glycine-max",
    tissue: "root",
    genomeBuild: "Wm82v4",
    coverage:
      "41 distinct genes, 9 root cell types; authors' Root-column assignments from the literature-derived panel. Contains soybean evidence and Arabidopsis orthology-derived markers; not an independently validated classifier.",
    markerGeneCount: 41,
    cellTypeCount: 9,
  },
  provenance: {
    retrievedAt: "2026-10-23",
    sheet: "Sheet1",
    columns: "A:R; root assignment H",
    genomeBuildEvidenceUrl:
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12136577/#P64",
    annotationMethodUrl:
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC12136577/#P69",
    genomeBuildEvidence:
      "Source Methods P64 reports Williams 82 v4. Table S2 was compiled and applied by these authors to that analysis. This imports their exact gene IDs and root assignments; it does not establish a universal cross-build mapping.",
    sourceBytes: definitions.markers.bytes,
    extraction:
      "Exact spreadsheet rows; underscores converted to spaces only in displayed cell-type names. Duplicate gene/type associations count once. Full source workbooks remain in ignored local storage.",
    rights:
      "Factual marker associations and numerical data extracted; article prose and full workbooks are not redistributed.",
  },
  records: extracted.markers.records,
  corroboration: {
    purpose:
      "Same-study de-novo marker corroboration only; excluded from annotation scoring and not independent validation.",
    columns: "S:Z; root tissue Z",
    records: extracted.markers.corroboration,
  },
};
reference.contentSha256 = sha(JSON.stringify(reference));
const benchmark = {
  version: 1,
  source: {
    title: "Published root barcode metadata · Zhang et al., Table S1",
    url: definitions.benchmark.url,
    doi: "10.1016/j.cell.2024.10.050",
    sha256: definitions.benchmark.sha256,
    bytes: definitions.benchmark.bytes,
    retrievedAt: "2026-10-23",
    sheet: "Sheet1",
    columns: "S:AD; root tissue T, barcode S, cluster Z, label AC",
  },
  datasetId: "gse270392-root-rna-v1",
  datasetArtifactVersion:
    "02f079834ad067c47b77e1e34c86501d783fa78fc1797c7aa7f8ab23c13bbda5",
  purpose:
    "Retrospective agreement with labels from the same study. Never used by the annotation engine. This is not independent biological validation or a generalization estimate.",
  ...extracted.benchmark,
};
for (const [file, value] of [
  ["data/references/soybean-annotation-v1.json", reference],
  ["data/references/soybean-root-label-benchmark-v1.json", benchmark],
]) {
  await writeFile(
    file,
    await format(JSON.stringify(value), { parser: "json" }),
  );
  console.log(
    JSON.stringify({
      stage: "generated",
      file,
      sha256: sha(JSON.stringify(value)),
    }),
  );
}
