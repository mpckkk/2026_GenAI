import "server-only";
import type { Memory } from "@/app/core/tools";
import { UnavailableIntegrationError } from "@/app/core/errors";

// H-MEM is a specification. Implement retrieval, mining and provenance before enabling it.
export class HmemMemory implements Memory {
  recall: Memory["recall"] = async () => {
    throw new UnavailableIntegrationError("H-MEM");
  };
  remember: Memory["remember"] = async () => {
    throw new UnavailableIntegrationError("H-MEM");
  };
}
