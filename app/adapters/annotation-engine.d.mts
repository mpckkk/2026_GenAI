import type { AnnotationProvider } from "../core/annotation";
import type { ScientificData } from "../core/scientific-data";

export class AnnotationError extends Error {
  code:
    | "annotation_cancelled"
    | "annotation_input_invalid"
    | "annotation_reference_unavailable"
    | "annotation_reference_incompatible"
    | "annotation_data_invalid";
}

export class MarkerAnnotationEngine implements AnnotationProvider {
  constructor(options: { scientificData: ScientificData });
  health: AnnotationProvider["health"];
  run: AnnotationProvider["run"];
}
