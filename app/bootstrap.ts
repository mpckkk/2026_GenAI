import "server-only";
import { KeycloakAuth } from "./adapters/auth";
import { PostgresProjects } from "./adapters/projects";
import { HmemMemory } from "./adapters/memory";
import { ZetarisData } from "./adapters/data";
import { NvidiaAssets } from "./adapters/assets";
import { NvidiaObservability } from "./adapters/observability-nvidia";
import { VercelModelGateway } from "./gateway/vercel";
import { AccessService } from "./services/access";
import { AnnotationService } from "./services/annotation";

const projects = new PostgresProjects();
const access = new AccessService(projects);
export const services = {
  auth: new KeycloakAuth(),
  projects,
  access,
  annotation: new AnnotationService(access),
  memory: new HmemMemory(),
  data: new ZetarisData(),
  assets: new NvidiaAssets(),
  observability: new NvidiaObservability(),
  model: new VercelModelGateway(),
};
