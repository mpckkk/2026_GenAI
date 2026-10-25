-- Canonical research/review tables remain unchanged. Only derived memory state.
CREATE TABLE research_memory (
  project_id uuid PRIMARY KEY REFERENCES projects(id),
  owner_id uuid NOT NULL REFERENCES app_users(id),
  state jsonb NOT NULL DEFAULT '{"seq":0,"records":[]}',
  engine_commit text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(jsonb_typeof(state->'records')='array')
);
CREATE TABLE research_memory_ledger (
  position bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES research_memory(project_id),
  owner_id uuid NOT NULL REFERENCES app_users(id),
  turn_id uuid NOT NULL REFERENCES agent_turns(id),
  entry jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX research_memory_ledger_project_idx ON research_memory_ledger(project_id,position);
CREATE FUNCTION prevent_memory_ledger_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Research memory ledger is append-only';
END;
$$;
CREATE TRIGGER memory_ledger_immutable BEFORE UPDATE OR DELETE ON research_memory_ledger
  FOR EACH ROW EXECUTE FUNCTION prevent_memory_ledger_mutation();
