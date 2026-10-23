import { createHash } from "node:crypto";
import corpus from "../../data/literature/soybean-v1.json" with { type: "json" };

const backend = "curated-lexical-v1";
const sha = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const canonical = (value) => value.trim().toLowerCase();
// Documented spellings of the same assembly, not gene-ID conversion.
const v4Names = new Set([
  "wm82v4",
  "williams 82 v4",
  "william 82 v4",
  "gmax_508_v4.0",
]);
const build = (value) =>
  v4Names.has(canonical(value)) ? "wm82v4" : canonical(value);
const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "show",
  "the",
  "their",
  "these",
  "this",
  "to",
  "use",
  "was",
  "what",
  "which",
  "with",
]);
const tokens = (value) => [
  ...new Set(
    (value.toLowerCase().match(/[a-z0-9][a-z0-9_.-]*/g) ?? []).filter(
      (token) => !stopWords.has(token),
    ),
  ),
];

export class LiteratureError extends Error {
  constructor(code = "literature_unavailable") {
    super(code);
    this.code = code;
  }
}

/** Explicit local lexical backend. No network calls or hidden embedding fallback. */
export class CuratedLiterature {
  async health() {
    const sourceIds = new Set(corpus.sources.map((source) => source.id));
    if (
      corpus.version !== 1 ||
      !corpus.passages.length ||
      sourceIds.size !== corpus.sources.length ||
      new Set(corpus.passages.map((p) => p.id)).size !==
        corpus.passages.length ||
      corpus.sources.some(
        (s) => !/^[a-f0-9]{64}$/.test(s.sourceSha256) || !s.doi || !s.coverage,
      ) ||
      corpus.passages.some((p) => {
        const source = corpus.sources.find((s) => s.id === p.sourceId);
        return (
          !source ||
          !p.url.startsWith(source.url) ||
          !p.summary ||
          !/^[a-f0-9]{64}$/.test(p.evidenceSha256) ||
          (p.genes.length &&
            (!p.genomeVersion ||
              !p.speciesId ||
              p.kind !== "marker_association"))
        );
      })
    )
      throw new LiteratureError();
    return {
      backend,
      corpusVersion: corpus.corpusVersion,
      corpusSha256: sha(corpus),
      sources: corpus.sources.length,
      passages: corpus.passages.length,
      geneAssociations: corpus.passages.filter(
        (p) => p.kind === "marker_association",
      ).length,
    };
  }

  async search(input) {
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).some(
        (key) =>
          ![
            "query",
            "speciesId",
            "tissue",
            "genomeVersion",
            "genes",
            "limit",
          ].includes(key),
      ) ||
      ["query", "speciesId", "tissue", "genomeVersion"].some(
        (key) =>
          typeof input[key] !== "string" ||
          !input[key].trim() ||
          input[key].length > (key === "query" ? 1000 : 120),
      ) ||
      (input.genes !== undefined &&
        (!Array.isArray(input.genes) ||
          input.genes.length > 100 ||
          input.genes.some(
            (gene) =>
              typeof gene !== "string" ||
              !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/.test(gene),
          ))) ||
      (input.limit !== undefined &&
        (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 12))
    )
      throw new LiteratureError("literature_query_invalid");
    const health = await this.health();
    const query = input.query.trim();
    const filters = {
      speciesId: canonical(input.speciesId),
      tissue: canonical(input.tissue),
      genomeVersion: input.genomeVersion.trim(),
      genes: [...new Set(input.genes ?? [])],
    };
    const terms = tokens(query);
    const excluded = new Map();
    const candidates = [];
    for (const passage of corpus.passages) {
      if (passage.speciesId && passage.speciesId !== filters.speciesId)
        continue;
      if (passage.tissues.length && !passage.tissues.includes(filters.tissue))
        continue;
      if (
        passage.genomeVersion &&
        build(passage.genomeVersion) !== build(filters.genomeVersion)
      ) {
        excluded.set(passage.sourceId, {
          sourceId: passage.sourceId,
          reason: "genome_mismatch",
          expectedGenomeVersion: passage.genomeVersion,
          requestedGenomeVersion: filters.genomeVersion,
        });
        continue;
      }
      if (
        filters.genes.length &&
        !passage.genes.some((gene) => filters.genes.includes(gene))
      )
        continue;
      const searchable = new Set(
        tokens(
          `${passage.title} ${passage.summary} ${passage.keywords.join(" ")}`,
        ),
      );
      const matchedTerms = terms.filter((term) => searchable.has(term));
      const matchedGenes = passage.genes.filter((gene) =>
        filters.genes.includes(gene),
      );
      if (!matchedTerms.length && !matchedGenes.length) continue;
      const source = corpus.sources.find((s) => s.id === passage.sourceId);
      const fields = Object.fromEntries(
        Object.entries(passage).filter(([key]) => key !== "keywords"),
      );
      candidates.push({
        score: matchedTerms.length + 5 * matchedGenes.length,
        hit: {
          ...fields,
          citation: source.citation,
          source: { ...source },
          compatibility: {
            species: passage.speciesId ? "exact" : "general",
            tissue: passage.tissues.length ? "exact" : "general",
            genome: passage.genomeVersion ? "exact" : "not_applicable",
          },
          matchedTerms,
        },
      });
    }
    const results = candidates
      .sort((a, b) => b.score - a.score || a.hit.id.localeCompare(b.hit.id))
      .slice(0, input.limit ?? 6)
      .map((row) => row.hit);
    return {
      version: 1,
      method: backend,
      corpusVersion: health.corpusVersion,
      corpusSha256: health.corpusSha256,
      status: results.length ? "results" : "no_results",
      query,
      filters,
      results,
      excludedSources: [...excluded.values()],
      limitations: [
        "A small curated public collection, searched by exact words and gene IDs. Full-paper vector search and exhaustive literature coverage are not configured.",
        "A relevant passage is not automatically support for an annotation. Method descriptions, published marker use, and the researcher's interpretation are different evidence types.",
        "No result means no match in this collection; it does not establish absence of biological evidence or contradiction. No automated contradiction classifier is connected.",
        "Genome mismatches are excluded from gene evidence. No identifier, orthology or genome-build conversion is performed.",
      ],
    };
  }
}
