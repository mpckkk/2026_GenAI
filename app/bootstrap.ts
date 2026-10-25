import { PostgresAnalysis } from "./adapters/analysis";
import { LocalScientificData } from "./adapters/scientific-data.mjs";
import { AnalysisService } from "./services/analysis";
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
import { PostgresMarkerImports } from "./adapters/marker-import";
import { MarkerImportService } from "./services/marker-import";

const projects = new PostgresProjects();
const access = new AccessService(projects);
const plants = new ConfiguredPlantCatalog(plantDefinitions);
const chat = new ChatService(access, new PostgresChat());
export const services = {
  auth: new KeycloakAuth(),
  projects,
  access,
  plants,
  research: new ResearchService(access, new PostgresResearch(), plants),
  markerImports: new MarkerImportService(
    access,
    new PostgresMarkerImports(),
    plants,
  ),
  analysis: new AnalysisService(
    access,
    new PostgresAnalysis(new LocalScientificData()),
  ),
  chat,
  annotation: new AnnotationService(access, chat),
  memory: new HmemMemory(),
  data: new ZetarisData(),
  assets: new NvidiaAssets(),
  observability: new NvidiaObservability(),
  model: new VercelModelGateway(),
};
