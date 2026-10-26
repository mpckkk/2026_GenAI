CREATE TABLE dataset_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id),
  owner_id uuid NOT NULL REFERENCES app_users(id),
  filename text NOT NULL CHECK(length(filename) BETWEEN 1 AND 200),
  size_bytes bigint NOT NULL CHECK(size_bytes BETWEEN 1 AND 4294967296),
  offset_bytes bigint NOT NULL DEFAULT 0 CHECK(offset_bytes>=0 AND offset_bytes<=size_bytes),
  file_fingerprint text NOT NULL CHECK(file_fingerprint ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'uploading' CHECK(status IN ('uploading','inspect_queued','inspecting','awaiting_selection','import_queued','importing','ready','failed')),
  sha256 text CHECK(sha256 IS NULL OR sha256 ~ '^[a-f0-9]{64}$'),
  inspection jsonb,
  selection jsonb,
  dataset_id text NOT NULL UNIQUE,
  manifest_sha256 text CHECK(manifest_sha256 IS NULL OR manifest_sha256 ~ '^[a-f0-9]{64}$'),
  dataset jsonb,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  CHECK(status<>'ready' OR (dataset IS NOT NULL AND manifest_sha256 IS NOT NULL AND sha256 IS NOT NULL))
);
CREATE UNIQUE INDEX dataset_uploads_one_active ON dataset_uploads(project_id) WHERE status<>'failed';
CREATE INDEX dataset_uploads_queue ON dataset_uploads(status,created_at) WHERE status IN ('inspect_queued','import_queued','inspecting','importing');
