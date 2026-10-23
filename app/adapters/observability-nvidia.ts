import "server-only";
import type { Observability } from "@/app/core/observability";
import { UnavailableIntegrationError } from "@/app/core/errors";

// Deliberate commissioning boundary. Do not claim success or execute untraced work.
// OTLP/HTTP protobuf export and Studio mapping need a real Intake acceptance run.
export class NvidiaObservability implements Observability {
  withSpan: Observability["withSpan"] = async () => {
    throw new UnavailableIntegrationError("NVIDIA NeMo Intake tracing");
  };
  async flush(): Promise<void> {
    throw new UnavailableIntegrationError("NVIDIA NeMo Intake tracing");
  }
}
