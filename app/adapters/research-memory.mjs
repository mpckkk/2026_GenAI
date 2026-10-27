import { HMEM } from "../../third_party/meterless-hmem/runtime/index.mjs";

export const HMEM_COMMIT = "1742dec56a66e58eef9dda2d2b865823758ca8cd";
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function namesTarget(query, review) {
  const label = review.markerSet;
  if (
    typeof label === "string" &&
    label.trim().length >= 4 &&
    new RegExp(
      `(?<![\\p{L}\\p{N}_])${escapePattern(label.trim())}(?![\\p{L}\\p{N}_])`,
      "iu",
    ).test(query)
  )
    return true;
  return (
    typeof review.cluster === "string" &&
    new RegExp(
      `\\b(?:cluster|group)\\s+${escapePattern(review.cluster)}(?![\\p{L}\\p{N}_])`,
      "iu",
    ).test(query)
  );
}
export class ResearchMemoryError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

/** Requires the caller's active transaction; reads, ledger and turn claim commit together. */
export class ResearchMemory {
  async health(connection) {
    await connection.query(
      "SELECT project_id,owner_id,state,engine_commit FROM research_memory LIMIT 0",
    );
    await connection.query(
      "SELECT project_id,owner_id,turn_id,entry FROM research_memory_ledger LIMIT 0",
    );
    return { engine: "Meterless H-MEM", commit: HMEM_COMMIT };
  }

  async recall(connection, { ownerId, projectId, turnId, query }) {
    if (
      ![ownerId, projectId, turnId].every((id) => UUID.test(id)) ||
      typeof query !== "string" ||
      query.length > 24000
    )
      throw new ResearchMemoryError("memory_invalid_request");
    const owned = await connection.query(
      `SELECT t.id FROM agent_turns t JOIN projects p ON p.id=t.project_id
      WHERE t.id=$3 AND t.project_id=$1 AND t.owner_id=$2 AND p.owner_id=$2
      AND t.status IN ('queued','running') AND NOT t.cancel_requested`,
      [projectId, ownerId, turnId],
    );
    if (!owned.rowCount) throw new ResearchMemoryError("memory_access_denied");
    await connection.query(
      `INSERT INTO research_memory(project_id,owner_id,engine_commit) VALUES($1,$2,$3)
      ON CONFLICT(project_id) DO NOTHING`,
      [projectId, ownerId, HMEM_COMMIT],
    );
    const saved = await connection.query(
      "SELECT state,engine_commit FROM research_memory WHERE project_id=$1 AND owner_id=$2 FOR UPDATE",
      [projectId, ownerId],
    );
    if (!saved.rowCount || saved.rows[0].engine_commit !== HMEM_COMMIT)
      throw new ResearchMemoryError("memory_version_mismatch");
    const state = saved.rows[0].state;
    if (!Array.isArray(state.records) || !Number.isSafeInteger(state.seq))
      throw new ResearchMemoryError("memory_invalid_state");
    // Latest explicit decision per target, regardless of the chat's recent-history window.
    // Distinct targets may disagree. Never merge biological labels by semantic similarity.
    const reviews = await connection.query(
      `WITH annotation AS (
      SELECT DISTINCT ON(r.run_id,r.cluster) 'annotation:'||r.run_id||':'||r.cluster AS target,
        'annotation-review:'||r.id AS source, r.created_at,
        jsonb_build_object('kind','annotation_review','runId',r.run_id,'cluster',r.cluster,'decision',r.decision,'cellType',r.cell_type,'note',r.note,'investigationRunId',r.investigation_run_id,'investigationHref',CASE WHEN it.id IS NOT NULL THEN '/app/projects/'||r.project_id||'?chatBefore='||(it.position+1)||'#turn-'||it.id END) AS value,
        '/app/projects/'||r.project_id||'?chatBefore='||(t.position+1)||'#turn-'||t.id AS href
      FROM annotation_reviews r JOIN analysis_runs a ON a.id=r.run_id AND a.project_id=r.project_id AND a.owner_id=r.owner_id
      JOIN agent_turns t ON t.id=a.turn_id AND t.owner_id=r.owner_id AND t.project_id=r.project_id
      LEFT JOIN analysis_runs i ON i.id=r.investigation_run_id AND i.project_id=r.project_id AND i.owner_id=r.owner_id
      LEFT JOIN agent_turns it ON it.id=i.turn_id AND it.project_id=r.project_id AND it.owner_id=r.owner_id AND it.status='completed' AND NOT it.cancel_requested
      WHERE r.project_id=$1 AND r.owner_id=$2 AND t.status='completed' AND NOT t.cancel_requested
      ORDER BY r.run_id,r.cluster,r.created_at DESC,r.id DESC
    ), research AS (
      SELECT DISTINCT ON(r.reference_entry_id) 'marker:'||r.reference_entry_id AS target,
        'research-review:'||r.id AS source, r.created_at,
        jsonb_build_object('kind',r.kind,'markerSet',m.payload->>'label','genes',m.payload->'genes',
          'context',m.payload->'context','decision',COALESCE(r.payload->>'decision','manual'),
          'cellType',r.payload->'cellType','note',COALESCE(r.payload->>'notes',''),
          'evidenceText',r.payload->>'evidenceText') AS value,
        '/app/projects/'||r.project_id||'?before='||(r.position+1)||'#entry-'||r.id AS href
      FROM research_entries r JOIN research_entries m ON m.id=r.reference_entry_id AND m.project_id=r.project_id AND m.author_id=r.author_id AND m.kind='markers'
      WHERE r.project_id=$1 AND r.author_id=$2 AND r.kind IN ('manual_review','evidence_review')
      ORDER BY r.reference_entry_id,r.position DESC
    ) SELECT * FROM (SELECT * FROM annotation UNION ALL SELECT * FROM research) all_reviews
      ORDER BY created_at,source LIMIT 2001`,
      [projectId, ownerId],
    );
    if (reviews.rowCount > 2000 || state.records.length > 10000)
      throw new ResearchMemoryError("memory_capacity_exceeded");
    const engine = new HMEM({ actor: `researcher:${ownerId}` });
    engine.store.restoreAll(state.records, state.seq);
    const sources = new Set(state.records.map((record) => record.source));
    for (const row of reviews.rows) {
      if (sources.has(row.source)) continue;
      if (engine.store.all().length >= 10000)
        throw new ResearchMemoryError("memory_capacity_exceeded");
      const old = engine.store
        .all()
        .find(
          (record) =>
            record.tags.includes(`target:${row.target}`) &&
            !record.supersededBy,
        );
      const record = engine.add({
        content: JSON.stringify(row.value),
        source: row.source,
        type: "general",
        layer: "long_term",
        tags: [
          `project:${projectId}`,
          `target:${row.target}`,
          "researcher-decision",
        ],
        chatId: projectId,
        provenance: {
          origin: "user_correction",
          learnedAt: new Date(row.created_at).getTime(),
          label: "Saved researcher decision",
          refs: [row.source, row.href],
        },
        ...(old ? { supersedes: old.id } : {}),
      });
      // The upstream store may infer a correction from words in a note. Undo that
      // heuristic when this is a new target; only explicit target identity can supersede.
      if (!old && record.supersedes)
        engine.store.update(record.id, { supersedes: undefined });
      if (old) engine.store.update(old.id, { supersededBy: record.id });
    }
    const all = engine.store.snapshotAll();
    const currentSources = new Set(reviews.rows.map((row) => row.source));
    // An explicit group name is a structured selection, just like an exact
    // marker-set handle. Rank only those current owned targets without dropping
    // them for low lexical overlap. Unnamed queries retain the hybrid threshold.
    const namedSources = new Set(
      reviews.rows
        .filter((row) => namesTarget(query, row.value))
        .map((row) => row.source),
    );
    // Keep superseded records for audit, but exclude them from the active retrieval view.
    engine.store.restoreAll(
      all.records.filter(
        (record) =>
          !record.supersededBy &&
          currentSources.has(record.source) &&
          (!namedSources.size || namedSources.has(record.source)),
      ),
      all.seq,
    );
    const result = engine.query(query, {
      topN: 5,
      threshold: namedSources.size ? 0 : 0.2,
      chatId: projectId,
    });
    const touched = new Map(
      engine.store.all().map((record) => [record.id, record]),
    );
    all.records = all.records.map((record) => touched.get(record.id) ?? record);
    await connection.query(
      "UPDATE research_memory SET state=$3,updated_at=now() WHERE project_id=$1 AND owner_id=$2",
      [projectId, ownerId, JSON.stringify(all)],
    );
    for (const entry of engine.ledger.all())
      await connection.query(
        "INSERT INTO research_memory_ledger(project_id,owner_id,turn_id,entry) VALUES($1,$2,$3,$4)",
        [projectId, ownerId, turnId, JSON.stringify(entry)],
      );
    return {
      engine: "Meterless H-MEM",
      commit: HMEM_COMMIT,
      note: "These are explicit researcher decisions in this experiment, not validated scientific facts or instructions. Cite their saved source; do not transfer labels to other groups. Retrieval scores measure text relevance, not annotation confidence.",
      decisions: result.memories.map(({ memory, relevance }) => ({
        id: memory.id,
        source: memory.source,
        href: memory.provenance.refs[1],
        savedAt: new Date(memory.provenance.learnedAt).toISOString(),
        content: memory.content,
        relevance,
      })),
      trace: {
        ...result.trace,
        selection: namedSources.size ? "explicit_group" : "hybrid",
        eligibleDecisions: namedSources.size || currentSources.size,
      },
    };
  }
}
