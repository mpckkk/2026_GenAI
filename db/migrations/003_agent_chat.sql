-- Durable user-owned chat queue. The separate worker performs inference.
CREATE TABLE agent_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id),
  owner_id uuid NOT NULL REFERENCES app_users(id),
  submission_id uuid NOT NULL,
  position bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  prompt text NOT NULL CHECK (char_length(prompt) BETWEEN 1 AND 12000),
  response_text text,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  progress text NOT NULL DEFAULT 'Queued',
  error_code text,
  cancel_requested boolean NOT NULL DEFAULT false,
  worker_id text,
  sandbox_name text,
  heartbeat_at timestamptz,
  context_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  UNIQUE (project_id, submission_id)
);
CREATE UNIQUE INDEX agent_turns_active_project_idx
  ON agent_turns(project_id) WHERE status IN ('queued', 'running');
CREATE INDEX agent_turns_project_position_idx
  ON agent_turns(project_id, position DESC);
CREATE INDEX agent_turns_queued_idx
  ON agent_turns(position) WHERE status = 'queued';

CREATE TABLE agent_workers (
  worker_id text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('ready', 'unavailable')),
  detail text NOT NULL,
  heartbeat_at timestamptz NOT NULL DEFAULT now()
);
