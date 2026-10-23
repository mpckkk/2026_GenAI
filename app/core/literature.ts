/** Public evidence only. Experiment ownership is enforced by the calling service. */
export interface LiteratureQuery {
  query: string;
  speciesId: string;
  tissue: string;
  genomeVersion: string;
  genes?: string[];
  limit?: number;
}

export interface LiteratureSource {
  id: string;
  title: string;
  citation: string;
  doi: string;
  url: string;
  retrievalUrl: string;
  retrievedAt: string;
  sourceSha256: string;
  license: string;
  coverage: string;
}

export interface LiteraturePassage {
  id: string;
  sourceId: string;
  title: string;
  /** Curated factual paraphrase, never an agent-generated conclusion. */
  summary: string;
  kind: "study_context" | "method" | "marker_association" | "limitation";
  speciesId: string | null;
  tissues: string[];
  genomeVersion: string | null;
  genes: string[];
  locator: string;
  url: string;
  evidenceSha256: string;
  /** Short source quotation when present; not a generated quotation. */
  excerpt: string | null;
  /** A retrieval hit does not establish support for a particular annotation. */
  applicability: string;
}

export interface LiteratureHit extends LiteraturePassage {
  citation: string;
  source: LiteratureSource;
  compatibility: {
    species: "exact" | "general";
    tissue: "exact" | "general";
    genome: "exact" | "not_applicable";
  };
  matchedTerms: string[];
}

export interface LiteratureSearchResult {
  version: 1;
  /** Explicit backend and algorithm version, not inferred from availability. */
  method: string;
  corpusVersion: string;
  corpusSha256: string;
  status: "results" | "no_results";
  query: string;
  filters: {
    speciesId: string;
    tissue: string;
    genomeVersion: string;
    genes: string[];
  };
  results: LiteratureHit[];
  excludedSources: {
    sourceId: string;
    reason: "genome_mismatch";
    expectedGenomeVersion: string;
    requestedGenomeVersion: string;
  }[];
  limitations: string[];
}

export type LiteratureResult = LiteratureSearchResult;

export interface LiteratureHealth {
  backend: string;
  corpusVersion: string;
  corpusSha256: string;
  sources: number;
  passages: number;
  geneAssociations: number;
}

/** Implementations must preserve evidence provenance and exact compatibility. */
export interface LiteratureSearch {
  health(): Promise<LiteratureHealth>;
  search(query: LiteratureQuery): Promise<LiteratureResult>;
}
