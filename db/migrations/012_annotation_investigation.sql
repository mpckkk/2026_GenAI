ALTER TABLE analysis_runs DROP CONSTRAINT analysis_runs_operation_check;
ALTER TABLE analysis_runs ADD CONSTRAINT analysis_runs_operation_check
  CHECK(operation IN ('inspect','markers','expression','dotplot','literature','annotation','investigation'));

CREATE TABLE investigation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id),
  owner_id uuid NOT NULL REFERENCES app_users(id),
  turn_id uuid NOT NULL UNIQUE REFERENCES agent_turns(id),
  source_run_id uuid NOT NULL,
  cluster text NOT NULL,
  provider_job_id text UNIQUE,
  evidence_sha256 text NOT NULL CHECK(evidence_sha256 ~ '^[a-f0-9]{64}$'),
  evidence jsonb NOT NULL,
  state text NOT NULL CHECK(state IN ('submitting','running','completed','failed','cancelled','submission_unknown')),
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(project_id,source_run_id) REFERENCES analysis_runs(project_id,id)
);
-- An uncertain submit is never automatically duplicated by a new turn.
CREATE UNIQUE INDEX investigation_jobs_active_target ON investigation_jobs(owner_id,project_id,source_run_id,cluster)
  WHERE state IN ('submitting','running','submission_unknown');

ALTER TABLE annotation_reviews ADD COLUMN investigation_run_id uuid;
ALTER TABLE annotation_reviews ADD CONSTRAINT annotation_review_investigation_fk
  FOREIGN KEY(project_id,investigation_run_id) REFERENCES analysis_runs(project_id,id);
