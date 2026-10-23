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
import { ConfiguredPlantCatalog } from "./adapters/plants";
import { plantDefinitions } from "./plant-catalog";
import { PostgresResearch } from "./adapters/research";
import { ResearchService } from "./services/research";
import { PostgresChat } from "./adapters/chat";
import { ChatService } from "./services/chat";

const projects = new PostgresProjects();
const access = new AccessService(projects);
const plants = new ConfiguredPlantCatalog(plantDefinitions);
export const services = {
  auth: new KeycloakAuth(),
  projects,
  access,
  plants,
  research: new ResearchService(access, new PostgresResearch(), plants),
  chat: new ChatService(access, new PostgresChat()),
  annotation: new AnnotationService(access),
  memory: new HmemMemory(),
  data: new ZetarisData(),
  assets: new NvidiaAssets(),
  observability: new NvidiaObservability(),
  model: new VercelModelGateway(),
};
