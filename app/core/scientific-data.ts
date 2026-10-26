export type ScientificOperation =
  "inspect" | "markers" | "expression" | "dotplot";

export interface ScientificDataset {
  id: string;
  title: string;
  speciesId: string;
  species: string;
  tissue: string;
  genomeBuild: string;
  genomeBuildEvidence: string;
  nCells: number;
  nGenes: number;
  artifactVersion: string;
  source: {
    accession: string;
    url: string;
    paperUrl: string;
    sha256: string;
    kind?: "uploaded-h5ad";
    filename?: string;
  };
}

export interface ScientificCluster {
  id: string;
  nCells: number;
  publishedLabel: string | null;
  sourceValue?: string;
}

export interface ScientificPoint {
  cellId: string;
  x: number;
  y: number;
  cluster: string;
  sampleId: string;
  value?: number;
  rawCount?: number;
}

export interface ScientificGene {
  geneId: string;
  sourceGeneId: string;
}

export interface ScientificMarker extends ScientificGene {
  score: number;
  meanLogExpression: number;
  otherMeanLogExpression: number;
  detectionFraction: number;
  otherDetectionFraction: number;
  meanCount: number;
}

export interface ScientificMethod {
  id: string;
  label: string;
  description: string;
  assay: string;
  layer: string;
  parameters: Record<string, string | number | boolean>;
}

export interface ScientificRunBase {
  version: 1;
  dataset: ScientificDataset;
  generatedAt: string;
  method: ScientificMethod;
  warnings: string[];
  summary: Record<string, unknown>;
}

export type ScientificResult = ScientificRunBase &
  (
    | {
        operation: "inspect";
        payload: {
          clusters: ScientificCluster[];
          embedding: { name: "UMAP"; points: ScientificPoint[] };
          assays: {
            name: string;
            nGenes: number;
            layers: Record<string, string>;
          }[];
        };
      }
    | {
        operation: "markers";
        payload: {
          cluster: string;
          comparison: "rest";
          nCells: number;
          otherNCells: number;
          markers: ScientificMarker[];
        };
      }
    | {
        operation: "expression";
        payload: {
          gene: ScientificGene;
          embedding: { name: "UMAP"; points: ScientificPoint[] };
          range: [number, number];
        };
      }
    | {
        operation: "dotplot";
        payload: {
          genes: ScientificGene[];
          clusters: ScientificCluster[];
          values: {
            geneId: string;
            cluster: string;
            meanLogExpression: number;
            detectionFraction: number;
            meanCount: number;
          }[];
        };
      }
  );

export interface ScientificData {
  health(): Promise<{
    status: "ready";
    backend: "local-sparse-cpu";
    datasetCount: number;
  }>;
  catalog(): Promise<ScientificDataset[]>;
  run(input: {
    datasetId: string;
    operation: ScientificOperation;
    cluster?: string;
    genes?: string[];
    signal?: AbortSignal;
  }): Promise<ScientificResult>;
}
