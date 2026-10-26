import {
  LocalScientificData,
  ScientificDataError,
} from "./scientific-data.mjs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unavailable = () =>
  new ScientificDataError(
    "scientific_data_unavailable",
    "The owned dataset is unavailable.",
  );
/** Public catalog stays public. Private files are resolved only after an owned attachment check. */
export class ProjectScientificData {
  constructor({
    database,
    publicData = new LocalScientificData(),
    directory = process.env.CELLORAS_UPLOADED_DATASET_DIR,
  } = {}) {
    this.database = database;
    this.publicData = publicData;
    this.directory = directory;
    this.providers = new Map();
  }
  async resolve(ownerId, projectId) {
    if (!UUID.test(ownerId) || !UUID.test(projectId)) throw unavailable();
    const db =
      typeof this.database === "function" ? this.database() : this.database;
    const rows = await db.query(
      `SELECT d.dataset_id,d.artifact_version,u.id AS upload_id,u.owner_id AS upload_owner,u.status,u.manifest_sha256
      FROM projects p JOIN project_datasets d ON d.project_id=p.id
      LEFT JOIN dataset_uploads u ON u.dataset_id=d.dataset_id AND u.project_id=p.id
      WHERE p.id=$1 AND p.owner_id=$2`,
      [projectId, ownerId],
    );
    const row = rows.rows[0];
    if (!row) throw unavailable();
    if (!row.dataset_id.startsWith("upload-")) {
      if (row.upload_id) throw unavailable();
      return {
        provider: this.publicData,
        datasetId: row.dataset_id,
        artifactVersion: row.artifact_version,
      };
    }
    if (
      !row.upload_id ||
      row.upload_owner !== ownerId ||
      row.status !== "ready" ||
      row.manifest_sha256 !== row.artifact_version ||
      !this.directory
    )
      throw unavailable();
    const key = `${row.dataset_id}:${row.artifact_version}`;
    // Keep only two private bundles cached; large experiments must not accumulate
    // indefinitely as different researchers open projects in the same process.
    const cached = this.providers.get(key);
    this.providers.delete(key);
    this.providers.set(
      key,
      cached ||
        new LocalScientificData({
          directory: this.directory,
          entries: [
            { id: row.dataset_id, manifestSha256: row.artifact_version },
          ],
        }),
    );
    while (this.providers.size > 2)
      this.providers.delete(this.providers.keys().next().value);
    return {
      provider: this.providers.get(key),
      datasetId: row.dataset_id,
      artifactVersion: row.artifact_version,
    };
  }
  forProject(ownerId, projectId) {
    const resolve = () => this.resolve(ownerId, projectId);
    return {
      async catalog() {
        const bound = await resolve();
        const items = await bound.provider.catalog();
        const item = items.find(
          (d) =>
            d.id === bound.datasetId &&
            d.artifactVersion === bound.artifactVersion,
        );
        if (!item) throw unavailable();
        return [item];
      },
      async run(input) {
        const bound = await resolve();
        if (input.datasetId !== bound.datasetId) throw unavailable();
        const result = await bound.provider.run(input);
        if (result.dataset.artifactVersion !== bound.artifactVersion)
          throw unavailable();
        return result;
      },
      async health() {
        return {
          status: "ready",
          backend: "local-sparse-cpu",
          datasetCount: (await this.catalog()).length,
        };
      },
    };
  }
}
