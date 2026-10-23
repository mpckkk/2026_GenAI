/** Species support is configuration; domain records never assume one plant. */
export interface PlantDefinition {
  id: string;
  commonName: string;
  scientificName: string;
  suggestedTissues: string[];
}

export interface PlantCatalog {
  list(): PlantDefinition[];
  find(speciesId: string): PlantDefinition | null;
}

export interface PlantContext {
  speciesId: string;
  tissue: string | null;
  sampleLabel: string | null;
  developmentalStage: string | null;
  genomeVersion: string | null;
  geneIdNamespace: string | null;
  notes: string;
}
