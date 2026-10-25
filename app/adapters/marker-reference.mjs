import { createHash } from "node:crypto";
import reference from "../../data/references/soybean-root-nodule-2024.json" with { type: "json" };
import { verifiedReference } from "./annotation-engine.mjs";

export class MarkerReferenceError extends Error {
  constructor() {
    super("marker_reference_unavailable");
    this.code = "marker_reference_unavailable";
  }
}
const canonical = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
const genePattern = /^Glyma\.[0-9]{2}G[0-9]{6}$/;

function atlasReference(data) {
  const r = data.reference;
  return {
    version: 1,
    source: {
      id: r.id,
      version: r.version,
      title: r.title,
      citation: "Zhang et al., Cell (2024), Table S2",
      doi: r.doi,
      url: r.url,
      section: "Sheet1, literature-derived Root column",
      speciesId: r.speciesId,
      genomeVersion: r.genomeBuild,
      geneIdNamespace: "Glyma",
      tissues: [r.tissue],
      retrievedAt: data.provenance.retrievedAt,
      sourceSha256: r.sha256,
      articleLicense: data.provenance.rights,
      coverage: r.coverage,
      ...(data.delivery ? { delivery: data.delivery } : {}),
    },
    records: data.records.map((row) => ({
      id: `table-s2:${row.row}:${row.geneId}:${row.cellType}`,
      geneId: row.geneId,
      cellType: row.cellType,
      sourceLabel: row.sourceLabel,
      tissue: "root",
      stage: "Check the source study's root sample context",
      sourceUrl: `${r.url}#Sheet1!H${row.row}`,
      method: `Table S2, Sheet1 row ${row.row}, Root column; source species ${row.sourceSpecies}; original reference ${row.originalReference}. ${canonical(row.sourceSpecies) !== "soybean" ? "Source evidence may involve cross-species orthology; review the original study." : ""}`,
    })),
  };
}

/** Explicit configured source. No network, symbol guessing or automatic build conversion. */
export class PublishedMarkerReference {
  constructor({
    atlasLoader = async () => verifiedReference(),
    atlasOnly = false,
  } = {}) {
    this.reference = reference;
    this.atlasLoader = atlasLoader;
    this.atlasOnly = atlasOnly;
  }
  async health(selected) {
    selected ??= this.atlasOnly
      ? atlasReference(await this.atlasLoader())
      : this.reference;
    const { source, records } = selected;
    const stableSource = { ...source };
    delete stableSource.delivery;
    if (
      selected.version !== 1 ||
      !records.length ||
      records.some(
        (r) =>
          !genePattern.test(r.geneId) ||
          !source.tissues.includes(r.tissue) ||
          !r.cellType ||
          !r.sourceUrl.startsWith(source.url + "#"),
      )
    ) {
      throw new MarkerReferenceError();
    }
    return {
      records: records.length,
      genes: new Set(records.map((r) => r.geneId)).size,
      source: {
        ...source,
        referenceSha256: createHash("sha256")
          .update(JSON.stringify({ ...selected, source: stableSource }))
          .digest("hex"),
      },
    };
  }
  async lookup(marker) {
    const selected =
      this.atlasOnly || canonical(marker.context?.genomeVersion) === "wm82v4"
        ? atlasReference(await this.atlasLoader())
        : this.reference;
    const { source } = await this.health(selected);
    const result = {
      version: 1,
      status: "no_matches",
      source,
      candidates: [],
      matchedGenes: [],
      unmatchedGenes: [],
      unsupportedGenes: [],
      sharedGenes: [],
      issues: [],
      limitations: [
        "Exact matches to a limited published marker list, not a validated cell-type prediction. Counts are not confidence scores.",
        "Shared expression, cell state, dropout and doublets can make marker overlap ambiguous. A missing match is not evidence against a cell type.",
        selected === this.reference
          ? "Reference samples: 6-day-old roots and nodules 28 days after inoculation. Check developmental stage, treatment and cultivar before interpreting matches."
          : "This is the atlas authors' root literature panel, including orthology-derived markers. It is not an independently validated classifier. Check stage, treatment and cultivar before interpreting matches.",
      ],
      method: "exact-marker-overlap-v1",
    };
    const context = marker.context;
    if (
      marker.speciesId !== source.speciesId ||
      (context && context.speciesId !== marker.speciesId)
    ) {
      result.status = "incompatible";
      result.issues.push(
        "This reference does not support the marker set's species.",
      );
      return result;
    }
    let missing = false,
      incompatible = false;
    for (const [field, label, expected] of [
      ["tissue", "Tissue", source.tissues],
      ["genomeVersion", "Genome/annotation version", [source.genomeVersion]],
      ["geneIdNamespace", "Gene ID namespace", [source.geneIdNamespace]],
    ]) {
      const value = canonical(context?.[field]);
      if (!value) {
        missing = true;
        result.issues.push(
          `${label} is missing. Supported: ${expected.join(", ")}. Save a new marker set with the correct attached sample context.`,
        );
      } else if (!expected.some((item) => canonical(item) === value)) {
        incompatible = true;
        result.issues.push(
          `${label} is not supported by this reference. Supported: ${expected.join(", ")}. No identifier or genome conversion was performed.`,
        );
      }
    }
    result.unsupportedGenes = marker.genes.filter(
      (gene) => !genePattern.test(gene),
    );
    if (result.unsupportedGenes.length)
      result.issues.push(
        "Some identifiers are not supported Glyma gene IDs. Symbols, transcript suffixes and malformed IDs were not converted.",
      );
    if (missing || incompatible) {
      result.status = incompatible ? "incompatible" : "context_required";
      return result;
    }
    const genes = new Set(
      marker.genes.filter((gene) => genePattern.test(gene)),
    );
    const rows = selected.records.filter(
      (record) =>
        record.tissue === canonical(context.tissue) && genes.has(record.geneId),
    );
    const candidates = new Map();
    for (const row of rows) {
      if (!candidates.has(row.cellType))
        candidates.set(row.cellType, {
          cellType: row.cellType,
          matchedGenes: [],
          records: [],
        });
      const candidate = candidates.get(row.cellType);
      if (!candidate.matchedGenes.includes(row.geneId))
        candidate.matchedGenes.push(row.geneId);
      candidate.records.push({ ...row });
    }
    // Alphabetic, never an uncalibrated ranking disguised as a prediction.
    result.candidates = [...candidates.values()].sort((a, b) =>
      a.cellType.localeCompare(b.cellType),
    );
    result.matchedGenes = [...genes].filter((gene) =>
      rows.some((row) => row.geneId === gene),
    );
    result.unmatchedGenes = [...genes].filter(
      (gene) => !result.matchedGenes.includes(gene),
    );
    result.sharedGenes = result.matchedGenes.flatMap((geneId) => {
      const cellTypes = result.candidates
        .filter((c) => c.matchedGenes.includes(geneId))
        .map((c) => c.cellType);
      return cellTypes.length > 1 ? [{ geneId, cellTypes }] : [];
    });
    if (result.candidates.length > 1)
      result.issues.push(
        "Matches span multiple cell types. Review competing explanations; overlap alone cannot choose an identity.",
      );
    if (result.sharedGenes.length)
      result.issues.push(
        "Some matched genes are listed for more than one cell type within this tissue.",
      );
    result.status = result.matchedGenes.length ? "matches_found" : "no_matches";
    return result;
  }
}
