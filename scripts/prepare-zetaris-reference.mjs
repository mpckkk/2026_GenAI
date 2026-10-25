// Administrator-side reference export; unrelated to researcher's matrix uploads.
import { writeFile, mkdir } from "node:fs/promises";
import { verifiedReference } from "../app/adapters/annotation-engine.mjs";
const reference = verifiedReference();
const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
const lines = [
  [
    "reference_id",
    "record_index",
    "gene_id",
    "cell_type",
    "record_json",
    "content_sha256",
  ],
  ...reference.records.map((record, index) => [
    reference.reference.id,
    index,
    record.geneId,
    record.cellType,
    JSON.stringify(record),
    reference.contentSha256,
  ]),
];
const path = new URL(
  "../.artifacts/sponsors/zetaris-marker-reference.csv",
  import.meta.url,
);
await mkdir(new URL(".", path), { recursive: true });
await writeFile(
  path,
  lines.map((row) => row.map(quote).join(",")).join("\n") + "\n",
);
console.log(
  JSON.stringify({
    event: "zetaris.reference.exported",
    records: reference.records.length,
    contentSha256: reference.contentSha256,
    file: path.pathname,
  }),
);
