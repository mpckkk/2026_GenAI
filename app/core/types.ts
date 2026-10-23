export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export interface User {
  id: string;
  displayName: string;
}
export interface Project {
  id: string;
  name: string;
  createdAt: string;
}
export interface Evidence {
  source: string;
  reference: string;
  genes: string[];
}
export interface AnnotationResult {
  cellType: string;
  evidence: Evidence[];
  disagreements: string[];
  // A score requires a documented method; model confidence is not a probability.
  score: { value: number; method: string } | null;
}
