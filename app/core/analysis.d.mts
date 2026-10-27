import type {
  ScientificAction,
  AnalysisRun,
  ScientificRun,
  LiteratureRun,
  AnnotationRun,
  InvestigationRun,
} from "./analysis";
export class AnalysisError extends Error {
  constructor(code: string);
  code: string;
}
export function parseScientificAction(value: unknown): ScientificAction;
export function analysisRun(
  row: Record<string, unknown>,
  full?: boolean,
):
  | AnalysisRun
  | ScientificRun
  | LiteratureRun
  | AnnotationRun
  | InvestigationRun;

export function analysisRun(
  row: Record<string, unknown>,
  full: true,
): AnalysisRun;
export function analysisCardType(
  operation: string,
):
  | "literature_result"
  | "annotation_result"
  | "scientific_result"
  | "investigation_result";
