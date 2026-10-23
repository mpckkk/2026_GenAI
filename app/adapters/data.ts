import "server-only";
import type { MarkerData } from "@/app/core/tools";
import { UnavailableIntegrationError } from "@/app/core/errors";

export class ZetarisData implements MarkerData {
  findEvidence: MarkerData["findEvidence"] = async () => {
    throw new UnavailableIntegrationError("Zetaris marker data");
  };
}
