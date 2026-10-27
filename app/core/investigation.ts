import type { ScientificDataset, ScientificMethod } from "./scientific-data";
import type {
  AnnotationCluster,
  AnnotationReference,
  ReferenceDelivery,
} from "./annotation";

export interface InvestigationAssessment {
  recommendation: string | null;
  summary: string;
  comparisons: Array<{
    candidateId: string;
    assessment: "supported" | "mixed" | "insufficient";
    explanation: string;
    evidenceIds: string[];
  }>;
  limitations: string[];
  nextCheck: {
    kind: "expression" | "literature" | "external_validation";
    genes: string[];
    reason: string;
  };
}
export interface InvestigationEvidence {
  id: string;
  kind: "marker" | "measurement";
  label: string;
  geneId?: string;
  sourceUrl?: string;
  sourceRows?: number[];
  sourceSpecies?: string;
  assessment?: string;
  detectionFraction?: number;
  enrichment?: number;
  details?: string;
}
export interface InvestigationPacket {
  sourceRunId: string;
  datasetId: string;
  artifactVersion: string;
  cluster: string;
  nCells: number;
  species: string;
  tissue: string;
  genomeBuild: string;
  before: {
    status: AnnotationCluster["status"];
    suggestedLabel: string | null;
    reason: string;
  };
  candidates: Array<{
    id: string;
    cellType: string;
    score: number;
    selectedGenes: string[];
  }>;
  availableGenes: string[];
  evidence: InvestigationEvidence[];
  check: {
    method: string;
    genes: string[];
    total: number;
    firstOnly: number;
    secondOnly: number;
    both: number;
    neither: number;
    perGene: Array<{ geneId: string; detected: number }>;
  };
}
export interface InvestigationResult {
  version: 1;
  operation: "investigation";
  dataset: ScientificDataset;
  generatedAt: string;
  method: ScientificMethod;
  warnings: string[];
  summary: {
    sourceRunId: string;
    cluster: string;
    finding: string;
    recommendation: string | null;
    attemptCount: number;
    disagreement: boolean;
    provider: "Meterless Nightshift";
    jobId: string;
  };
  payload: {
    packet: InvestigationPacket;
    reference: AnnotationReference;
    referenceDelivery?: ReferenceDelivery;
    attempts: Array<{
      sequence: number;
      model: string | null;
      assessment: InvestigationAssessment;
    }>;
    selectedAttempt: number | null;
    receipt: {
      provider: "Meterless Nightshift";
      jobId: string;
      state: string;
      completedAt: string;
      evidenceSha256: string;
    };
  };
}
/** Optional review execution, separate from the conversational agent runtime. */
export interface InvestigationProvider {
  run(input: {
    packet: InvestigationPacket;
    signal?: AbortSignal;
    onSubmitted: (jobId: string) => Promise<void>;
    progress: (message: string) => void;
  }): Promise<{
    jobId: string;
    attempts: InvestigationResult["payload"]["attempts"];
    selectedAttempt: number | null;
  }>;
  cancel(jobId: string): Promise<void>;
}
