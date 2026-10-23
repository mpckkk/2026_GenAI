-- Additive conversation storage. Biological species and tissues stay in data,
-- never in schema constraints. Prior project IDs and rows remain untouched.
CREATE TABLE research_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id),
  author_id uuid NOT NULL REFERENCES app_users(id),
  submission_id uuid NOT NULL,
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  position bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  kind text NOT NULL CHECK (kind IN ('message', 'context', 'markers', 'manual_review')),
  payload jsonb NOT NULL CHECK (
    jsonb_typeof(payload) = 'object' AND payload ? 'kind' AND payload->>'kind' = kind
  ),
  reference_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, submission_id),
  UNIQUE (project_id, id),
  FOREIGN KEY (project_id, reference_entry_id) REFERENCES research_entries(project_id, id),
  CHECK (
    (kind IN ('message', 'context') AND reference_entry_id IS NULL) OR
    (kind = 'markers') OR
    (kind = 'manual_review' AND reference_entry_id IS NOT NULL)
  ),
  CHECK (
    kind <> 'markers' OR
    payload->>'contextEntryId' IS NOT DISTINCT FROM reference_entry_id::text
  ),
  CHECK (
    kind <> 'manual_review' OR
    payload->>'markerEntryId' IS NOT DISTINCT FROM reference_entry_id::text
  )
);
CREATE INDEX research_entries_project_position_idx
  ON research_entries(project_id, position DESC);
CREATE INDEX research_entries_context_idx
  ON research_entries(project_id, position DESC) WHERE kind = 'context';
CREATE INDEX research_entries_markers_idx
  ON research_entries(project_id, position DESC) WHERE kind = 'markers';
