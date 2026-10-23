import type {
  ScientificAction,
  AnalysisRun,
  ScientificRun,
  LiteratureRun,
} from "./analysis";
export class AnalysisError extends Error {
  constructor(code: string);
  code: string;
}
export function parseScientificAction(value: unknown): ScientificAction;
export function analysisRun(
  row: Record<string, unknown>,
  full?: boolean,
): AnalysisRun | ScientificRun | LiteratureRun;

export function analysisRun(
  row: Record<string, unknown>,
  full: true,
): AnalysisRun;
