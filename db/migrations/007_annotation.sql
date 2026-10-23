-- Existing numerical/evidence results remain unchanged. Annotation is additive.
ALTER TABLE analysis_runs DROP CONSTRAINT analysis_runs_operation_check;
ALTER TABLE analysis_runs ADD CONSTRAINT analysis_runs_operation_check
  CHECK(operation IN ('inspect','markers','expression','dotplot','literature','annotation'));

CREATE TABLE annotation_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id),
  owner_id uuid NOT NULL REFERENCES app_users(id),
  run_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  cluster text NOT NULL CHECK(length(cluster) BETWEEN 1 AND 64),
  decision text NOT NULL CHECK(decision IN ('accepted','corrected','unresolved','rejected')),
  cell_type text,
  note text NOT NULL CHECK(length(note) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK((decision IN ('accepted','corrected') AND cell_type IS NOT NULL AND length(cell_type) BETWEEN 1 AND 200)
    OR (decision IN ('unresolved','rejected') AND cell_type IS NULL)),
  UNIQUE(project_id,submission_id),
  FOREIGN KEY(project_id,run_id) REFERENCES analysis_runs(project_id,id)
);
CREATE INDEX annotation_reviews_run_idx ON annotation_reviews(project_id,run_id,created_at DESC);
