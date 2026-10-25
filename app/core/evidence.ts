import type { MarkerEntry } from "./research";

export interface MarkerReferenceSource {
  delivery?: import("./annotation").ReferenceDelivery;
  id: string;
  version: string;
  title: string;
  citation: string;
  doi: string;
  url: string;
  section: string;
  speciesId: string;
  genomeVersion: string;
  geneIdNamespace: string;
  tissues: string[];
  retrievedAt: string;
  sourceSha256: string;
  referenceSha256: string;
  articleLicense: string;
  coverage: string;
}
export interface MarkerEvidenceRecord {
  id: string;
  geneId: string;
  cellType: string;
  sourceLabel: string;
  tissue: string;
  stage: string;
  sourceUrl: string;
  method: string;
}
export interface EvidenceCandidate {
  cellType: string;
  matchedGenes: string[];
  records: MarkerEvidenceRecord[];
}
export interface MarkerEvidenceResult {
  version: 1;
  status: "matches_found" | "no_matches" | "context_required" | "incompatible";
  source: MarkerReferenceSource;
  candidates: EvidenceCandidate[];
  matchedGenes: string[];
  unmatchedGenes: string[];
  unsupportedGenes: string[];
  sharedGenes: { geneId: string; cellTypes: string[] }[];
  issues: string[];
  limitations: string[];
  method: "exact-marker-overlap-v1";
}
export interface MarkerEvidenceRun extends MarkerEvidenceResult {
  id: string;
  projectId: string;
  turnId: string;
  turnPosition: string;
  marker: MarkerEntry;
  createdAt: string;
}
export interface MarkerEvidenceSource {
  lookup(marker: MarkerEntry): Promise<MarkerEvidenceResult>;
  health(): Promise<{
    records: number;
    genes: number;
    source: MarkerReferenceSource;
  }>;
}
export type EvidenceReviewDecision = "candidate" | "unresolved" | "rejected";

export interface EvidenceReviewReceipt {
  id: string;
  evidenceRunId: string;
  position: string;
  decision: EvidenceReviewDecision;
  cellType: string | null;
  notes: string;
  createdAt: string;
}
