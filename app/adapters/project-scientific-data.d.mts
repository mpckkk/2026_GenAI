import type { Pool, PoolClient } from "pg";
import type { ScientificData } from "../core/scientific-data";
export class ProjectScientificData {
  constructor(options: {
    database: Pool | PoolClient | (() => Pool);
    publicData?: ScientificData;
    directory?: string;
  });
  publicData: ScientificData;
  forProject(ownerId: string, projectId: string): ScientificData;
}
