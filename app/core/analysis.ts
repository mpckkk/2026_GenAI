import type {
  ScientificDataset,
  ScientificOperation,
  ScientificResult,
  ScientificPoint,
} from "./scientific-data";
import type { LiteratureResult } from "./literature";
import type { AnnotationResult, AnnotationReview } from "./annotation";
export interface ScientificAction {
  operation: ScientificOperation | "literature" | "annotation";
  datasetId: string;
  cluster?: string;
  genes?: string[];
  query?: string;
}
export interface AnalysisWorkspace {
  dataset: ScientificDataset | null;
  available: boolean;
  reason?: string;
}
export type ScientificSummary = Omit<ScientificResult, "payload">;
interface Run {
  id: string;
  projectId: string;
  turnId: string;
  datasetId: string;
  createdAt: string;
}
export interface ScientificRun extends Run {
  result: ScientificSummary;
}
export interface LiteratureRun extends Run {
  result: LiteratureResult;
}
export interface AnnotationRun extends Run {
  result: Omit<AnnotationResult, "payload">;
}
export type AnalysisRun =
  (Run & { result: ScientificResult | AnnotationResult }) | LiteratureRun;
export interface AnalysisReview {
  id: string;
  runId: string;
  decision: "supported" | "uncertain" | "rejected";
  note: string;
  cluster: string | null;
  createdAt: string;
}

export interface AnnotationMap {
  runId: string;
  dataset: ScientificDataset;
  embedding: { name: "UMAP"; points: ScientificPoint[] };
}

/** Owned durable analysis boundary, independent of the numerical provider. */
export interface AnalysisRepository {
  annotationMap(
    userId: string,
    projectId: string,
    runId: string,
  ): Promise<AnnotationMap>;
  workspace(userId: string, projectId: string): Promise<AnalysisWorkspace>;
  startDemo(userId: string): Promise<{ projectId: string; url: string }>;
  get(
    userId: string,
    projectId: string,
    runId: string,
  ): Promise<
    AnalysisRun & {
      reviews: AnalysisReview[];
      annotationReviews: AnnotationReview[];
    }
  >;
  review(
    userId: string,
    projectId: string,
    runId: string,
    input: unknown,
  ): Promise<{ review: AnalysisReview }>;
  reviewAnnotation(
    userId: string,
    projectId: string,
    runId: string,
    input: unknown,
  ): Promise<{ review: AnnotationReview }>;
}
