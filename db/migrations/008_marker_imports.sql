-- Small, immutable source CSVs; numerical matrix files use a separate store.
CREATE TABLE marker_imports (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  owner_id uuid NOT NULL REFERENCES app_users(id),
  submission_id uuid NOT NULL,
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  file_name text NOT NULL,
  original_csv text NOT NULL CHECK (octet_length(original_csv) <= 262144),
  receipt jsonb NOT NULL CHECK (jsonb_typeof(receipt) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, submission_id)
);
CREATE INDEX marker_imports_project_created_idx ON marker_imports(project_id, created_at DESC);
