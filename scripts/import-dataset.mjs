import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { buildBundle, sha256 } from "../infra/science/import-bundle.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (
    !["--source", "--directory"].includes(args[i]) ||
    !args[i + 1] ||
    args[i + 1].startsWith("--")
  ) {
    throw new Error(
      "Usage: node scripts/import-dataset.mjs --source /path/to/original.rds.gz --directory /absolute/dataset-store",
    );
  }
  options[args[i].slice(2)] = args[i + 1];
}
const directory = path.resolve(
  options.directory ||
    process.env.CELLORAS_DATASET_DIR ||
    path.join(root, ".artifacts/scientific-data"),
);
const descriptor = JSON.parse(
  await readFile(
    path.join(root, "data/datasets/gse270392-root-rna-v1.json"),
    "utf8",
  ),
);
const source = path.resolve(
  options.source ||
    path.join(
      root,
      ".artifacts/datasets/GSE270392/GSE270392_Gm_atlas_Root.rna.seurat.obj.rds.gz",
    ),
);
await access(source);
const sourceHash = await sha256(source);
if (sourceHash !== descriptor.source.sha256)
  throw new Error(
    "Source checksum does not match the curated dataset; import refused",
  );
console.log(
  JSON.stringify({
    step: "source_verified",
    datasetId: descriptor.id,
    sha256: sourceHash,
  }),
);
await mkdir(directory, { recursive: true });
const destination = path.join(directory, descriptor.id);
try {
  await access(destination);
  throw new Error(
    "An immutable dataset directory already exists; verify it with LocalScientificData instead of overwriting it",
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const staging = path.join(directory, `.import-${randomUUID()}`);
const working = path.join(staging, "work");
await mkdir(working, { recursive: true });
const exported = path.join(working, "export");
const unwrapped = path.join(working, "source.rds");
await pipeline(
  createReadStream(source),
  createGunzip(),
  createWriteStream(unwrapped, { flags: "wx" }),
);
console.log(
  JSON.stringify({
    step: "outer_gzip_removed",
    note: "The RDS retains its own internal gzip compression",
  }),
);
const rScript = path.join(root, "infra/science/export-seurat.R");
const image =
  "r-base:4.6.1@sha256:ad9b3bbca751f3ead77704fed4c20246127647b3d567b2bf970b7789e8d7b9a8";
await new Promise((resolve, reject) => {
  const child = spawn(
    "docker",
    [
      "run",
      "--rm",
      "--network",
      "none",
      "--memory",
      "3g",
      "--cpus",
      "1",
      "-v",
      `${working}:/work`,
      "-v",
      `${rScript}:/export.R:ro`,
      image,
      "Rscript",
      "/export.R",
      "/work/source.rds",
      "/work/export",
    ],
    { stdio: "inherit" },
  );
  child.on("error", reject);
  child.on("exit", (code) =>
    code === 0
      ? resolve()
      : reject(
          new Error(
            `R export failed (${code}); staging retained at ${staging}`,
          ),
        ),
  );
});
console.log(JSON.stringify({ step: "r_export_validated" }));
const result = await buildBundle({
  source,
  exported,
  destination: path.join(staging, "bundle"),
  descriptor,
  exporterSha256: await sha256(rScript),
});
console.log(JSON.stringify({ step: "indexed_and_crosschecked", ...result }));
// Publish an already validated directory and catalog atomically; never replace an
// existing dataset version. Failed staging directories remain available to inspect.
const catalogPath = path.join(directory, "catalog.json");
let catalog = { version: 1, datasets: [] };
try {
  catalog = JSON.parse(await readFile(catalogPath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (
  catalog.version !== 1 ||
  !Array.isArray(catalog.datasets) ||
  catalog.datasets.some((d) => d.id === descriptor.id)
) {
  throw new Error("Invalid catalog or duplicate immutable dataset ID");
}
await rename(path.join(staging, "bundle"), destination);
catalog.datasets.push({
  id: descriptor.id,
  manifestSha256: result.manifestSha256,
});
const nextCatalog = path.join(directory, `.catalog-${randomUUID()}.json`);
await writeFile(nextCatalog, JSON.stringify(catalog) + "\n", { flag: "wx" });
await rename(nextCatalog, catalogPath);
await rm(staging, { recursive: true });
console.log(
  JSON.stringify({
    step: "dataset_published",
    directory,
    datasetId: descriptor.id,
    artifactVersion: result.manifestSha256,
  }),
);
