import "server-only";
import type { PostgresDatasetUploads } from "../adapters/dataset-upload";
import type { AccessService } from "./access";
export class DatasetUploadService {
  constructor(
    private readonly access: AccessService,
    private readonly repository: PostgresDatasetUploads,
  ) {}
  async list(userId: string, projectId: string) {
    await this.access.requireProject(userId, projectId);
    return this.repository.list(userId, projectId);
  }
  async get(userId: string, projectId: string, uploadId: string) {
    await this.access.requireProject(userId, projectId);
    return this.repository.get(userId, projectId, uploadId);
  }
  async create(userId: string, projectId: string, input: unknown) {
    await this.access.requireProject(userId, projectId);
    return this.repository.create(userId, projectId, input);
  }
  async append(
    userId: string,
    projectId: string,
    uploadId: string,
    offset: number,
    chunk: Uint8Array,
    sha256: string,
  ) {
    await this.access.requireProject(userId, projectId);
    return this.repository.append(
      userId,
      projectId,
      uploadId,
      offset,
      chunk,
      sha256,
    );
  }
  async complete(userId: string, projectId: string, uploadId: string) {
    await this.access.requireProject(userId, projectId);
    return this.repository.complete(userId, projectId, uploadId);
  }
  async select(
    userId: string,
    projectId: string,
    uploadId: string,
    input: unknown,
  ) {
    await this.access.requireProject(userId, projectId);
    return this.repository.select(userId, projectId, uploadId, input);
  }
}
