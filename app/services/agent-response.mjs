import { analysisRun } from "../core/analysis.mjs";
import {
  AgentResponseError,
  parseAgentResponse,
} from "../core/agent-response.mjs";

/** Shared runtime boundary: resolve IDs against canonical owned records. */
export async function resolveAgentResponse(
  connection,
  { response, projectId, ownerId, availableCards },
) {
  const parsed = parseAgentResponse(response);
  const references = parsed.blocks.filter((block) => block.type !== "markdown");
  for (const reference of references) {
    if (
      ["lookup_marker_evidence", "run_scientific_tool"].includes(reference.type)
    )
      throw new AgentResponseError();
    if (
      !availableCards.some(
        (card) =>
          card.type === reference.type && card.entryId === reference.entryId,
      )
    ) {
      throw new AgentResponseError("agent_card_unavailable");
    }
  }
  const result = await connection.query(
    `SELECT r.id,r.project_id,r.submission_id,r.position::text,r.kind,r.payload,r.created_at
     FROM research_entries r JOIN projects p ON p.id=r.project_id
     WHERE r.project_id=$1 AND p.owner_id=$2 AND r.author_id=$2 AND r.id=ANY($3::uuid[])`,
    [projectId, ownerId, references.map((reference) => reference.entryId)],
  );
  const records = new Map(result.rows.map((row) => [row.id, row]));
  const evidence = await connection.query(
    `SELECT e.id,e.project_id,e.turn_id,e.result,e.created_at FROM marker_evidence_runs e
     JOIN projects p ON p.id=e.project_id JOIN agent_turns t ON t.id=e.turn_id
     WHERE e.project_id=$1 AND p.owner_id=$2 AND e.owner_id=$2 AND t.owner_id=$2
       AND t.project_id=$1 AND t.status IN ('running','completed') AND NOT t.cancel_requested
       AND e.id=ANY($3::uuid[])`,
    [
      projectId,
      ownerId,
      references
        .filter((r) => r.type === "marker_evidence")
        .map((r) => r.entryId),
    ],
  );
  const runs = new Map(evidence.rows.map((row) => [row.id, row]));
  const analyses = await connection.query(
    `SELECT a.* FROM analysis_runs a
    JOIN projects p ON p.id=a.project_id JOIN agent_turns t ON t.id=a.turn_id
    WHERE a.project_id=$1 AND a.owner_id=$2 AND p.owner_id=$2 AND t.project_id=$1 AND t.owner_id=$2
      AND t.status IN ('running','completed') AND NOT t.cancel_requested AND a.id=ANY($3::uuid[])`,
    [
      projectId,
      ownerId,
      references
        .filter((r) =>
          ["scientific_result", "literature_result"].includes(r.type),
        )
        .map((r) => r.entryId),
    ],
  );
  const analysis = new Map(analyses.rows.map((row) => [row.id, row]));
  const blocks = parsed.blocks.map((block) => {
    if (block.type === "markdown") return block;
    if (["scientific_result", "literature_result"].includes(block.type)) {
      const row = analysis.get(block.entryId);
      if (
        !row ||
        (row.operation === "literature") !==
          (block.type === "literature_result")
      )
        throw new AgentResponseError("agent_card_unavailable");
      return { type: block.type, result: analysisRun(row) };
    }
    if (block.type === "marker_evidence") {
      const row = runs.get(block.entryId);
      if (!row) throw new AgentResponseError("agent_card_unavailable");
      return {
        type: block.type,
        result: {
          ...row.result,
          id: row.id,
          projectId: row.project_id,
          turnId: row.turn_id,
          createdAt: row.created_at.toISOString(),
        },
      };
    }
    const row = records.get(block.entryId);
    const kind = block.type === "sample_context" ? "context" : "markers";
    if (!row || row.kind !== kind || row.payload?.kind !== kind) {
      throw new AgentResponseError("agent_card_unavailable");
    }
    return {
      type: block.type,
      entry: {
        ...row.payload,
        id: row.id,
        projectId: row.project_id,
        submissionId: row.submission_id,
        position: row.position,
        actor: "researcher",
        createdAt: row.created_at.toISOString(),
      },
    };
  });
  return { version: 1, blocks };
}
