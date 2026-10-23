import type { PlantDefinition } from "./core/plants";

/** Reviewed product configuration. Tissues are suggestions, not an ontology. */
export const plantDefinitions: readonly PlantDefinition[] = [
  {
    id: "glycine-max",
    commonName: "Soybean",
    scientificName: "Glycine max",
    suggestedTissues: ["Root", "Leaf", "Nodule", "Stem", "Seed", "Flower"],
  },
];
