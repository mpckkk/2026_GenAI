import "server-only";
import type { ModelGateway } from "@/app/core/tools";
import { UnavailableIntegrationError } from "@/app/core/errors";

// Add the AI SDK only when the chosen Nemotron model and gateway route are verified.
export class VercelModelGateway implements ModelGateway {
  annotate: ModelGateway["annotate"] = async () => {
    throw new UnavailableIntegrationError("Nemotron through Vercel AI Gateway");
  };
}
