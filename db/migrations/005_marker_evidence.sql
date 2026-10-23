-- Evidence is an immutable tool result. A later researcher decision is separate.
CREATE TABLE marker_evidence_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id),
  owner_id uuid NOT NULL REFERENCES app_users(id),
  turn_id uuid NOT NULL REFERENCES agent_turns(id),
  marker_entry_id uuid NOT NULL,
  result jsonb NOT NULL CHECK (
    jsonb_typeof(result)='object' AND result->>'version'='1'
    AND jsonb_typeof(result->'candidates')='array' AND result ? 'source'
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(turn_id),
  UNIQUE(project_id,id),
  FOREIGN KEY(project_id,marker_entry_id) REFERENCES research_entries(project_id,id)
);
CREATE INDEX marker_evidence_runs_project_idx ON marker_evidence_runs(project_id,created_at DESC);
ALTER TABLE research_entries DROP CONSTRAINT research_entries_kind_check;
ALTER TABLE research_entries ADD CONSTRAINT research_entries_kind_check
  CHECK(kind IN ('message','context','markers','manual_review','evidence_review'));
-- Replace only the kind/reference check; preserve payload and existing reference checks.
ALTER TABLE research_entries DROP CONSTRAINT research_entries_check1;
ALTER TABLE research_entries ADD CONSTRAINT research_entries_reference_kind_check CHECK (
  (kind IN ('message','context') AND reference_entry_id IS NULL) OR kind='markers' OR
  (kind IN ('manual_review','evidence_review') AND reference_entry_id IS NOT NULL)
);
ALTER TABLE research_entries ADD COLUMN evidence_run_id uuid;
ALTER TABLE research_entries ADD CONSTRAINT research_entries_evidence_run_fk
  FOREIGN KEY(project_id,evidence_run_id) REFERENCES marker_evidence_runs(project_id,id);
ALTER TABLE research_entries ADD CONSTRAINT research_entries_evidence_review_check CHECK (
  (kind='evidence_review' AND evidence_run_id IS NOT NULL
   AND payload->>'evidenceRunId'=evidence_run_id::text
   AND payload->>'markerEntryId'=reference_entry_id::text) OR
  (kind<>'evidence_review' AND evidence_run_id IS NULL)
);
