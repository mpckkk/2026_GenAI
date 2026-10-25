import type { PublishedMarkerReference } from "./marker-reference.mjs";
import type {
  AnnotationReferenceDocument,
  ReferenceDelivery,
} from "../core/annotation";
export class ZetarisError extends Error {
  code: string;
}
export class ZetarisReference {
  load(options?: {
    signal?: AbortSignal;
  }): Promise<AnnotationReferenceDocument>;
  health(): Promise<ReferenceDelivery>;
}
export function configuredReferences(): {
  name: string;
  marker: PublishedMarkerReference;
  load(options?: {
    signal?: AbortSignal;
  }): Promise<AnnotationReferenceDocument>;
};
