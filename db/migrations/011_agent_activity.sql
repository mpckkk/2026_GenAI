-- Existing turns remain explicitly uninstrumented; only future admission records v1.
ALTER TABLE agent_turns ADD COLUMN activity_version smallint CHECK(activity_version = 1);
ALTER TABLE agent_turns ALTER COLUMN activity_version SET DEFAULT 1;

CREATE TABLE agent_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  turn_id uuid NOT NULL REFERENCES agent_turns(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  owner_id uuid NOT NULL REFERENCES app_users(id),
  span_id text NOT NULL CHECK(span_id ~ '^[A-Za-z0-9_.:-]{1,100}$'),
  parent_span_id text CHECK(parent_span_id ~ '^[A-Za-z0-9_.:-]{1,100}$'),
  kind text NOT NULL CHECK(kind IN ('queue','context','memory','model','tool','reference','response','cleanup')),
  phase text NOT NULL CHECK(phase IN ('started','completed','failed','cancelled','info')),
  name text NOT NULL CHECK(char_length(name) BETWEEN 1 AND 160),
  summary text NOT NULL CHECK(char_length(summary) BETWEEN 1 AND 2000),
  data jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(data)='object' AND octet_length(data::text)<=16384),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(turn_id,span_id,phase),
  CHECK(parent_span_id IS DISTINCT FROM span_id)
);
CREATE INDEX agent_activity_turn_position_idx ON agent_activity_events(turn_id,position);
CREATE INDEX agent_activity_owner_turn_idx ON agent_activity_events(owner_id,project_id,turn_id);

CREATE FUNCTION guard_agent_activity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Agent activity is append-only';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM agent_turns t JOIN projects p ON p.id=t.project_id
    WHERE t.id=NEW.turn_id AND t.project_id=NEW.project_id AND t.owner_id=NEW.owner_id
      AND p.owner_id=NEW.owner_id AND t.activity_version=1
  ) THEN
    RAISE EXCEPTION 'Agent activity ownership or recording version mismatch';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER agent_activity_immutable BEFORE INSERT OR UPDATE OR DELETE ON agent_activity_events
  FOR EACH ROW EXECUTE FUNCTION guard_agent_activity();

-- Admission and terminal events commit with the queue itself, even when a worker
-- crashes, a claim fails, or a researcher cancels a request before it is claimed.
CREATE FUNCTION record_agent_turn_activity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE safe_error text;
BEGIN
  IF NEW.activity_version IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' THEN
    INSERT INTO agent_activity_events(turn_id,project_id,owner_id,span_id,kind,phase,name,summary)
    VALUES(NEW.id,NEW.project_id,NEW.owner_id,'queue','queue','started','Request queued','The request was saved and is waiting for an agent worker.');
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status='running' THEN
      INSERT INTO agent_activity_events(turn_id,project_id,owner_id,span_id,kind,phase,name,summary)
      VALUES(NEW.id,NEW.project_id,NEW.owner_id,'queue','queue','completed','Worker accepted request','An agent worker accepted the saved request.')
      ON CONFLICT(turn_id,span_id,phase) DO NOTHING;
    ELSIF NEW.status IN ('completed','failed','cancelled') THEN
      safe_error := CASE WHEN NEW.error_code ~ '^[A-Za-z0-9_.:-]{1,100}$' THEN NEW.error_code ELSE NULL END;
      INSERT INTO agent_activity_events(turn_id,project_id,owner_id,span_id,kind,phase,name,summary,data)
      VALUES(NEW.id,NEW.project_id,NEW.owner_id,'turn','response',NEW.status,
        CASE NEW.status WHEN 'completed' THEN 'Answer saved' WHEN 'failed' THEN 'Request failed' ELSE 'Request cancelled' END,
        CASE NEW.status WHEN 'completed' THEN 'The answer was saved to the conversation.'
          WHEN 'failed' THEN 'The agent could not finish this request. Earlier recorded steps remain available.'
          ELSE 'The request was cancelled. Earlier recorded steps remain available.' END,
        CASE WHEN safe_error IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('errorCode',safe_error) END)
      ON CONFLICT(turn_id,span_id,phase) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER agent_turn_activity AFTER INSERT OR UPDATE OF status ON agent_turns
  FOR EACH ROW EXECUTE FUNCTION record_agent_turn_activity();
