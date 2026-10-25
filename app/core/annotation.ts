import type { ScientificDataset, ScientificMethod } from "./scientific-data";

export interface AnnotationReference {
  id: string;
  version: string;
  sha256: string;
  title: string;
  url: string;
  doi: string;
  speciesId: string;
  tissue: string;
  genomeBuild: string;
  coverage: string;
  markerGeneCount: number;
  cellTypeCount: number;
}

export interface ReferenceDelivery {
  provider: "Zetaris";
  requestId: string;
  retrievedAt: string;
  recordCount: number;
  contentSha256: string;
}
export interface AnnotationReferenceDocument {
  version: number;
  reference: AnnotationReference;
  provenance: Record<string, unknown>;
  records: Array<Record<string, unknown>>;
  contentSha256: string;
  delivery?: ReferenceDelivery;
}

export interface AnnotationGeneEvidence {
  geneId: string;
  sourceGeneId: string;
  markerName: string;
  sourceRows: number[];
  sourceUrl: string;
  sourceSpecies: string;
  orthologyType: string | null;
  originalReferences: string[];
  meanLogExpression: number;
  otherMeanLogExpression: number;
  detectionFraction: number;
  otherDetectionFraction: number;
  enrichment: number;
  zScore: number;
  assessment: "supports" | "conflicts" | "not_informative";
}

export interface AnnotationCandidate {
  cellType: string;
  score: number;
  referenceGeneCount: number;
  availableGeneCount: number;
  supportingGenes: AnnotationGeneEvidence[];
  conflictingGenes: AnnotationGeneEvidence[];
  uninformativeGenes: AnnotationGeneEvidence[];
  missingGenes: string[];
  reason: string;
}

export interface AnnotationCluster {
  cluster: string;
  nCells: number;
  status: "suggested" | "ambiguous" | "unresolved";
  suggestedLabel: string | null;
  candidates: AnnotationCandidate[];
  reason: string;
}

export interface AnnotationResult {
  version: 1;
  operation: "annotation";
  dataset: ScientificDataset;
  generatedAt: string;
  method: ScientificMethod;
  warnings: string[];
  summary: {
    clusterCount: number;
    suggestedCount: number;
    ambiguousCount: number;
    unresolvedCount: number;
    candidates: {
      cluster: string;
      status: AnnotationCluster["status"];
      suggestedLabel: string | null;
      leadingCandidate: string | null;
      reason: string;
      topCandidates: {
        cellType: string;
        score: number;
        supportingGenes: string[];
        conflictingGenes: string[];
        reason: string;
      }[];
    }[];
    referenceId: string;
    referenceVersion: string;
    referenceUrl: string;
    referenceDelivery?: ReferenceDelivery;
  };
  payload: {
    reference: AnnotationReference;
    referenceDelivery?: ReferenceDelivery;
    clusters: AnnotationCluster[];
    validation: {
      status: "not_independently_validated";
      description: string;
      independentAccuracy: null;
    };
  };
}

export interface AnnotationProvider {
  run(input: {
    datasetId: string;
    cluster?: string;
    signal?: AbortSignal;
  }): Promise<AnnotationResult>;
  health(): Promise<{ status: "ready"; reference: AnnotationReference }>;
}

/** A researcher decision, never an overwrite of computed evidence. */
export interface AnnotationReview {
  id: string;
  runId: string;
  cluster: string;
  decision: "accepted" | "corrected" | "unresolved" | "rejected";
  cellType: string | null;
  note: string;
  createdAt: string;
}
