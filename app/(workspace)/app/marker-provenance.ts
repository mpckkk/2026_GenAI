import type {
  MarkerEvidenceRecord,
  MarkerReferenceSource,
} from "@/app/core/evidence";

export function referenceLink(value: string): string | null {
  try {
    const url = new URL(
      /^10\.\d{4,9}\//.test(value) ? `https://doi.org/${value}` : value,
    );
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function referenceHost(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, "");
  return (
    (
      {
        "biorxiv.org": "bioRxiv",
        "researchsquare.com": "Research Square",
        "pmc.ncbi.nlm.nih.gov": "PubMed Central",
        "doi.org": "DOI reference",
      } as Record<string, string>
    )[host] ?? host
  );
}

/** Read the exact v1 format emitted by atlasReference, without rewriting saved evidence.
 * Other source formats do not establish the original reference species. */
export function markerProvenance(
  record: MarkerEvidenceRecord,
  source: MarkerReferenceSource,
) {
  const method = record.method
    .replace(
      / Source evidence may involve cross-species orthology; review the original study\.$/,
      "",
    )
    .trim();
  const fields =
    source.version === "cell-2024.10.050-table-s2-root-v1"
      ? method.match(
          /^Table S2, Sheet1 row (\d+), Root column; source species ([^;]+); original reference (.+)\.$/,
        )
      : null;
  const recognized =
    fields && record.sourceUrl.endsWith(`#Sheet1!H${fields[1]}`);
  const species = recognized ? fields[2].trim() : null;
  const original = recognized ? fields[3] : null;
  return {
    species: species?.toLowerCase() === "soybean" ? "Soybean" : species,
    crossSpecies: species ? species.toLowerCase() !== "soybean" : null,
    locator: recognized ? `Table S2 · Sheet 1 · Row ${fields[1]}` : null,
    originalReference: original,
    studyUrl: original
      ? referenceLink(original)
      : referenceLink(record.sourceUrl),
    studyKind: original ? "Cited study" : "Published source",
    sourceUrl: referenceLink(record.sourceUrl),
  };
}
