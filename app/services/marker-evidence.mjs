import { AgentResponseError } from "../core/agent-response.mjs";

/** Always resolve model references in the owned project, even if the offered catalog was tampered with. */
export async function runMarkerEvidence(
  connection,
  source,
  { projectId, ownerId, turnId, markerEntryId, availableCards, signal },
) {
  if (signal?.aborted) throw new AgentResponseError("cancelled");
  if (
    !availableCards.some(
      (card) => card.type === "marker_set" && card.entryId === markerEntryId,
    )
  ) {
    throw new AgentResponseError("agent_card_unavailable");
  }
  const result = await connection.query(
    `SELECT r.id,r.project_id,r.submission_id,r.position::text,r.payload,r.created_at,t.position::text AS turn_position
     FROM research_entries r JOIN projects p ON p.id=r.project_id
     JOIN agent_turns t ON t.id=$4 AND t.project_id=p.id AND t.owner_id=$2
     WHERE p.id=$1 AND p.owner_id=$2 AND r.author_id=$2 AND r.id=$3 AND r.kind='markers'
       AND t.status='running' AND NOT t.cancel_requested`,
    [projectId, ownerId, markerEntryId, turnId],
  );
  const row = result.rows[0];
  if (!row || row.payload?.kind !== "markers")
    throw new AgentResponseError("agent_card_unavailable");
  const marker = {
    ...row.payload,
    id: row.id,
    projectId: row.project_id,
    submissionId: row.submission_id,
    position: row.position,
    actor: "researcher",
    createdAt: row.created_at.toISOString(),
  };
  const evidence = await source.lookup(marker);
  if (signal?.aborted) throw new AgentResponseError("cancelled");
  const saved = await connection.query(
    `INSERT INTO marker_evidence_runs(project_id,owner_id,turn_id,marker_entry_id,result)
     SELECT p.id,$2,$3,$4,$5::jsonb FROM projects p JOIN agent_turns t ON t.project_id=p.id
     WHERE p.id=$1 AND p.owner_id=$2 AND t.id=$3 AND t.owner_id=$2 AND t.status='running' AND NOT t.cancel_requested
     RETURNING id,created_at`,
    [
      projectId,
      ownerId,
      turnId,
      markerEntryId,
      JSON.stringify({ ...evidence, marker, turnPosition: row.turn_position }),
    ],
  );
  if (!saved.rows[0]) throw new AgentResponseError("cancelled");
  return {
    ...evidence,
    marker,
    turnPosition: row.turn_position,
    id: saved.rows[0].id,
    projectId,
    turnId,
    createdAt: saved.rows[0].created_at.toISOString(),
  };
}
