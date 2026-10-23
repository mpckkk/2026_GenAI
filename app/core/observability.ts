import type { JsonValue } from "./types";

export type SpanAttributes = Record<string, string | number | boolean>;
export interface Observation {
  name: string;
  kind: "agent" | "model" | "tool" | "data" | "memory";
  input?: JsonValue;
  attributes?: SpanAttributes;
}
export interface ObservationSpan {
  readonly traceId: string;
  readonly spanId: string;
  setOutput(output: JsonValue): void;
  setAttributes(attributes: SpanAttributes): void;
}
export interface Observability {
  withSpan<T>(
    observation: Observation,
    work: (span: ObservationSpan) => Promise<T>,
  ): Promise<T>;
  flush(): Promise<void>;
}
