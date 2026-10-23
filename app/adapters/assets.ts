import "server-only";
import type { Assets } from "@/app/core/tools";
import { UnavailableIntegrationError } from "@/app/core/errors";

export class NvidiaAssets implements Assets {
  read: Assets["read"] = async () => {
    throw new UnavailableIntegrationError("NVIDIA NeMo Files");
  };
  write: Assets["write"] = async () => {
    throw new UnavailableIntegrationError("NVIDIA NeMo Files");
  };
}
