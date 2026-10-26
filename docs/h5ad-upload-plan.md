# Implementation plan: owned H5AD import

Upload a real preprocessed soybean H5AD, select its raw-count matrix, gene identifiers, existing groups and UMAP, then use the existing visual scientific tools and annotation flow. The first release accepts up to 4 GiB, 100,000 cells/genes and 100 million nonzero counts. It does not perform sequencing-read alignment, QC, clustering or UMAP calculation. Current marker annotation remains restricted to compatible soybean root Wm82v4 inputs; another tissue/build can be explored but is not silently relabelled.

## Boundaries and contract

Browser -> authenticated, same-origin project upload routes -> durable PostgreSQL upload state plus immutable source bytes -> resource-bounded Python import worker -> verified sparse bundle -> owner-scoped scientific provider -> existing tool results/cards. An upload never enters the public dataset catalog. Each experiment receives one immutable dataset attachment.

States: uploading -> inspect_queued -> inspecting -> awaiting_selection -> import_queued -> importing -> ready, or failed. UUID paths are server-generated. Every HTTP/file boundary and worker claim checks project ownership. Chunks are at most 8 MiB, use acknowledged byte offsets, per-chunk SHA256 and a client file fingerprint for resume identity. The worker calculates and rechecks whole-file SHA256. An interrupted write is truncated to the committed offset before retry. Import completion and project attachment commit in one transaction.

Routes under `/api/projects/[projectId]/dataset-uploads`: GET latest; POST filename,sizeBytes,fileFingerprint. `/:uploadId`: GET status; PATCH octet-stream with Upload-Offset and X-Chunk-SHA256. `/:uploadId/complete`: POST queue inspection; `/:uploadId/selection`: POST matrix,geneColumn,groupColumn,embedding,genomeBuild,tissue,speciesId,rawCountsConfirmed. GET latest returns {upload,attached,chunkSize,maxBytes}; other operations return the upload object. No returned server filesystem paths.

## File ledger

| Action | File                                                                       | Change                                                      | Package |
| ------ | -------------------------------------------------------------------------- | ----------------------------------------------------------- | ------- |
| CREATE | db/migrations/010_dataset_uploads.sql                                      | Durable owned upload/import state                           | 1       |
| CREATE | app/core/dataset-upload.ts                                                 | Upload limits, selection/status and errors                  | 1       |
| CREATE | app/adapters/dataset-upload.ts                                             | Transactional bounded chunk storage and queue submission    | 2       |
| CREATE | app/services/dataset-upload.ts                                             | Access-checked upload service                               | 2       |
| CREATE | app/api/projects/[projectId]/dataset-uploads/route.ts                      | Create/list                                                 | 2       |
| CREATE | app/api/projects/[projectId]/dataset-uploads/[uploadId]/route.ts           | Status/chunks                                               | 2       |
| CREATE | app/api/projects/[projectId]/dataset-uploads/[uploadId]/complete/route.ts  | Queue inspection                                            | 2       |
| CREATE | app/api/projects/[projectId]/dataset-uploads/[uploadId]/selection/route.ts | Confirm import                                              | 2       |
| CREATE | app/api/projects/[projectId]/dataset-uploads/respond.ts                    | Consistent safe errors                                      | 2       |
| CREATE | app/adapters/project-scientific-data.mjs                                   | Owner-bound private manifest resolution                     | 3       |
| CREATE | app/adapters/project-scientific-data.d.mts                                 | Typed scoped provider                                       | 3       |
| UPDATE | app/adapters/scientific-data.mjs                                           | Explicit immutable entries and H5AD provenance              | 3       |
| UPDATE | app/adapters/scientific-data.d.mts                                         | Explicit-entry options                                      | 3       |
| UPDATE | app/adapters/analysis.ts                                                   | Owned scientific provider for map/workspace                 | 3       |
| UPDATE | app/bootstrap.ts                                                           | Upload/scoped data composition                              | 3       |
| UPDATE | infra/agent/worker.mjs                                                     | Per-project scientific tools and annotation                 | 3       |
| UPDATE | infra/agent/Dockerfile                                                     | Copy scoped provider                                        | 3       |
| UPDATE | compose.yaml                                                               | Bounded importer, writable source/read-only output mounts   | 4       |
| UPDATE | app/services/health.ts                                                     | Fresh importer heartbeat and queue schema check             | 4       |
| UPDATE | .env.example                                                               | Upload paths/limits configuration                           | 4       |
| CREATE | infra/science/h5ad/importer.py                                             | Strict H5AD inspection/conversion, owned by importer worker | 2       |
| CREATE | infra/science/h5ad/worker.py                                               | Durable queue consumer/heartbeat, owned by importer worker  | 2       |
| CREATE | infra/science/h5ad/Dockerfile                                              | Bounded scientific importer image, owned by importer worker | 4       |
| CREATE | docs/h5ad-upload-plan.md                                                   | Boundary and acceptance record                              | 1       |

Frontend upload components and entry points are owned by the UI worker and recorded in its change report. No deletion or renaming.

## Ordered packages and acceptance

1. Persist the contract. Apply migration additively; existing demo attachment and analysis rows remain untouched.
2. Receive/inspect/import. Real file upload across multiple chunks; interrupted request resumes from committed offset. Invalid/truncated/external-link HDF5, non-count matrices, missing groups/UMAP and incompatible selected dimensions fail visibly. No default matrix selection is interpreted as raw counts without confirmation.
3. Bind private data to existing tools. Owned upload resolves only after ready/attachment checksum match. Another account/project cannot obtain it via catalog, run or map. Public demo still resolves its configured public ID.
4. Run the real stack. Worker bounded CPU/memory; health freshness surfaced; browser upload -> map -> annotation -> review with actual sponsor reference and memory. Record checks and screenshots in verification docs. A build/typecheck alone is not acceptance.

Rollback stops the importer and disables entry points while preserving immutable attachments and existing results. Migration is additive; never delete uploads or overwrite a published dataset to roll back. Cleanup/retention policy remains an explicit operational follow-up.
