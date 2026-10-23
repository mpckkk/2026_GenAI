import "server-only";
import type { PlantCatalog, PlantDefinition } from "@/app/core/plants";

/** A versioned configuration adapter. Adding a species does not change storage. */
export class ConfiguredPlantCatalog implements PlantCatalog {
  private readonly plants: PlantDefinition[];

  constructor(definitions: readonly PlantDefinition[]) {
    if (!Array.isArray(definitions) || definitions.length === 0)
      throw new Error(
        "Plant catalog must contain at least one supported species",
      );
    const ids = new Set<string>();
    this.plants = definitions.map((definition: PlantDefinition) => {
      if (
        !definition ||
        typeof definition.id !== "string" ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(definition.id) ||
        definition.id.length > 120 ||
        ids.has(definition.id)
      )
        throw new Error(
          "Plant catalog IDs must be unique, lowercase identifiers",
        );
      ids.add(definition.id);
      for (const value of [definition.commonName, definition.scientificName]) {
        if (
          typeof value !== "string" ||
          !value.trim() ||
          value !== value.trim() ||
          value.length > 120
        )
          throw new Error("Plant catalog names must contain 1–120 characters");
      }
      if (
        !Array.isArray(definition.suggestedTissues) ||
        definition.suggestedTissues.some(
          (tissue) =>
            typeof tissue !== "string" ||
            !tissue.trim() ||
            tissue !== tissue.trim() ||
            tissue.length > 120,
        ) ||
        new Set(
          definition.suggestedTissues.map((tissue) => tissue.toLowerCase()),
        ).size !== definition.suggestedTissues.length
      )
        throw new Error("Plant tissue suggestions must be valid and distinct");
      return {
        ...definition,
        suggestedTissues: [...definition.suggestedTissues],
      };
    });
  }

  list(): PlantDefinition[] {
    return this.plants.map((plant) => ({
      ...plant,
      suggestedTissues: [...plant.suggestedTissues],
    }));
  }

  find(speciesId: string): PlantDefinition | null {
    const plant = this.plants.find((item) => item.id === speciesId);
    return plant
      ? { ...plant, suggestedTissues: [...plant.suggestedTissues] }
      : null;
  }
}
