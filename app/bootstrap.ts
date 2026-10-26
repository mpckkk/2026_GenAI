import { PostgresAnalysis } from "./adapters/analysis";
import { ProjectScientificData } from "./adapters/project-scientific-data.mjs";
import { database } from "./adapters/database";
import { PostgresDatasetUploads } from "./adapters/dataset-upload";
import { DatasetUploadService } from "./services/dataset-upload";
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
import { PostgresActivity } from "./adapters/activity";
import { ActivityService } from "./services/activity";

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
  datasetUploads: new DatasetUploadService(
    access,
    new PostgresDatasetUploads(),
  ),
  analysis: new AnalysisService(
    access,
    new PostgresAnalysis(new ProjectScientificData({ database })),
  ),
  chat,
  activity: new ActivityService(access, new PostgresActivity()),
  annotation: new AnnotationService(access, chat),
  memory: new HmemMemory(),
  data: new ZetarisData(),
  assets: new NvidiaAssets(),
  observability: new NvidiaObservability(),
  model: new VercelModelGateway(),
};
