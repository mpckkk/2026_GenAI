-- Legacy replies remain text. New documents contain only resolved, owned data.
ALTER TABLE agent_turns ADD COLUMN response_document jsonb CHECK (
  response_document IS NULL OR (
    jsonb_typeof(response_document) = 'object'
    AND response_document->>'version' = '1'
    AND jsonb_typeof(response_document->'blocks') = 'array'
    AND response_document ? 'version' AND response_document ? 'blocks'
  )
);
