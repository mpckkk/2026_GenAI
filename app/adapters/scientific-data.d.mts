import type { ScientificData } from "../core/scientific-data";

export class ScientificDataError extends Error {
  code:
    | "scientific_data_unavailable"
    | "scientific_input_invalid"
    | "scientific_dataset_missing"
    | "scientific_gene_missing"
    | "scientific_cancelled";
}

export class LocalScientificData implements ScientificData {
  constructor(options?: { directory?: string });
  health: ScientificData["health"];
  catalog: ScientificData["catalog"];
  run: ScientificData["run"];
}
