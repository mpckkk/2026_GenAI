import type {
  MarkerEvidenceSource,
  MarkerEvidenceResult,
  MarkerReferenceSource,
} from "../core/evidence";
import type { MarkerEntry } from "../core/research";
export class PublishedMarkerReference implements MarkerEvidenceSource {
  health(): Promise<{
    records: number;
    genes: number;
    source: MarkerReferenceSource;
  }>;
  lookup(marker: MarkerEntry): Promise<MarkerEvidenceResult>;
}
export class MarkerReferenceError extends Error {
  code: string;
}
