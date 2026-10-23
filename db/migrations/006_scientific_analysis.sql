-- Dataset artifacts are immutable public inputs; project attachments and results remain owned.
CREATE TABLE project_datasets (
  project_id uuid PRIMARY KEY REFERENCES projects(id),
  dataset_id text NOT NULL,
  artifact_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE demo_projects (
  owner_id uuid NOT NULL REFERENCES app_users(id),
  demo_key text NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(id),
  PRIMARY KEY(owner_id,demo_key)
);
ALTER TABLE agent_turns ADD COLUMN requested_action jsonb CHECK(requested_action IS NULL OR jsonb_typeof(requested_action)='object');
CREATE TABLE analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id),
  owner_id uuid NOT NULL REFERENCES app_users(id),
  turn_id uuid NOT NULL REFERENCES agent_turns(id),
  dataset_id text NOT NULL,
  artifact_version text NOT NULL,
  step integer NOT NULL CHECK(step BETWEEN 0 AND 3),
  operation text NOT NULL CHECK(operation IN ('inspect','markers','expression','dotplot','literature')),
  input jsonb NOT NULL,
  result jsonb NOT NULL CHECK(jsonb_typeof(result)='object' AND result->>'version'='1'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(turn_id,step),
  UNIQUE(project_id,id)
);
CREATE INDEX analysis_runs_project_idx ON analysis_runs(project_id,created_at DESC);
CREATE TABLE analysis_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id),
  owner_id uuid NOT NULL REFERENCES app_users(id),
  run_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  decision text NOT NULL CHECK(decision IN ('supported','uncertain','rejected')),
  note text NOT NULL CHECK(length(note) BETWEEN 1 AND 4000),
  cluster text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id,submission_id),
  FOREIGN KEY(project_id,run_id) REFERENCES analysis_runs(project_id,id)
);
CREATE INDEX analysis_reviews_run_idx ON analysis_reviews(project_id,run_id,created_at DESC);
