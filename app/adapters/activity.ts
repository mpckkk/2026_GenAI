import "server-only";
import type {
  ActivityData,
  ActivityEvent,
  ActivityFilters,
  ActivityList,
  ActivityRepository,
  ActivityRunDetail,
  ActivityRunSummary,
} from "../core/activity";
import { ChatTurnNotFoundError } from "../core/chat";
import { ProjectNotFoundError } from "../core/errors";
import { database } from "./database";
import { validateActivityData } from "./activity-events.mjs";

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const safeText = (v: unknown, max = 160): string | null =>
  typeof v === "string" && v.length <= max && !/[\u0000-\u001f\u007f]/u.test(v)
    ? v
    : null;
const iso = (v: Date | null): string | null => (v ? v.toISOString() : null);
type RunRow = {
  id: string;
  project_id: string;
  project_name: string;
  position: string;
  prompt: string;
  status: ActivityRunSummary["status"];
  cancel_requested: boolean;
  error_code: string | null;
  created_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
  runtime: string | null;
  model: string | null;
  tool_count: number;
  activity_version: number | null;
  response_text?: string | null;
  recalled_decisions?: unknown;
  dataset_id?: string | null;
  artifact_version?: string | null;
  dataset_name?: string | null;
};
const COLUMNS = `t.id,t.project_id,p.name AS project_name,t.position::text,t.prompt,t.status,t.cancel_requested,t.error_code,
 t.created_at,t.started_at,t.finished_at,t.activity_version,
 COALESCE((SELECT e.data->>'runtime' FROM agent_activity_events e WHERE e.turn_id=t.id AND e.owner_id=t.owner_id AND e.project_id=t.project_id AND e.data ? 'runtime' ORDER BY e.position DESC LIMIT 1),t.context_snapshot->>'agentRuntime') AS runtime,
 (SELECT e.data->>'model' FROM agent_activity_events e WHERE e.turn_id=t.id AND e.owner_id=t.owner_id AND e.project_id=t.project_id AND e.data ? 'model' ORDER BY e.position DESC LIMIT 1) AS model,
 (SELECT count(DISTINCT e.span_id)::int FROM agent_activity_events e WHERE e.turn_id=t.id AND e.owner_id=t.owner_id AND e.project_id=t.project_id AND e.kind='tool' AND e.phase='started') AS tool_count`;
function run(row: RunRow): ActivityRunSummary {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    position: row.position,
    prompt: row.prompt,
    status: row.status,
    errorCode:
      row.error_code && /^[A-Za-z0-9_.:-]{1,100}$/.test(row.error_code)
        ? row.error_code
        : null,
    createdAt: row.created_at.toISOString(),
    startedAt: iso(row.started_at),
    finishedAt: iso(row.finished_at),
    runtime: safeText(row.runtime),
    model: safeText(row.model),
    durationMs:
      row.started_at && row.finished_at
        ? Math.max(0, row.finished_at.getTime() - row.started_at.getTime())
        : null,
    toolCount: row.tool_count,
    recordingVersion: row.activity_version,
  };
}
function conversationHref(projectId: string, turnId: string, position: string) {
  return `/app/projects/${projectId}?chatBefore=${BigInt(position) + 1n}#turn-${turnId}`;
}
const TITLES: Record<string, string> = {
  inspect: "Cell map",
  markers: "Marker comparison",
  expression: "Gene expression",
  dotplot: "Gene comparison",
  literature: "Literature evidence",
  annotation: "Cell-type annotation",
  marker_evidence: "Marker evidence",
};
function resultSummary(
  operation: string,
  summary: Record<string, unknown>,
): string {
  const number = (key: string) =>
    typeof summary[key] === "number" &&
    Number.isSafeInteger(summary[key]) &&
    Number(summary[key]) >= 0
      ? Number(summary[key]).toLocaleString("en-US")
      : null;
  if (operation === "annotation") {
    return (
      [
        ["suggestedCount", "suggested"],
        ["ambiguousCount", "ambiguous"],
        ["unresolvedCount", "unresolved"],
      ]
        .flatMap(([key, label]) =>
          number(key) !== null ? [`${number(key)} ${label}`] : [],
        )
        .join(" · ") || "Saved annotation result"
    );
  }
  if (operation === "inspect")
    return (
      [
        ["nCells", "cells"],
        ["nGenes", "genes"],
        ["nClusters", "groups"],
      ]
        .flatMap(([key, label]) =>
          number(key) !== null ? [`${number(key)} ${label}`] : [],
        )
        .join(" · ") || "Saved cell map"
    );
  if (operation === "markers")
    return number("rankedGeneCount") !== null
      ? `${number("rankedGeneCount")} ranked genes`
      : "Saved marker comparison";
  return "Saved result with source and method details";
}

export class PostgresActivity implements ActivityRepository {
  async ownedProjectId(userId: string, turnId: string): Promise<string> {
    if (!UUID.test(userId) || !UUID.test(turnId))
      throw new ChatTurnNotFoundError();
    const found = await database().query<{ project_id: string }>(
      `SELECT t.project_id FROM agent_turns t JOIN projects p ON p.id=t.project_id
       WHERE t.id=$1 AND t.owner_id=$2 AND p.owner_id=$2`,
      [turnId, userId],
    );
    if (!found.rows[0]) throw new ChatTurnNotFoundError();
    return found.rows[0].project_id;
  }

  async list(userId: string, filters: ActivityFilters): Promise<ActivityList> {
    if (!UUID.test(userId)) throw new ProjectNotFoundError();
    const args = [userId, filters.projectId ?? null, filters.q ?? null];
    const where = `t.owner_id=$1 AND p.owner_id=$1 AND ($2::uuid IS NULL OR t.project_id=$2)
      AND ($3::text IS NULL OR strpos(lower(t.prompt),lower($3))>0 OR strpos(lower(p.name),lower($3))>0)`;
    const [rows, totals, projects] = await Promise.all([
      database().query<RunRow>(
        `SELECT ${COLUMNS} FROM agent_turns t JOIN projects p ON p.id=t.project_id
        WHERE ${where} AND ($4::text IS NULL OR t.status=$4 OR ($4='active' AND t.status IN ('queued','running')))
          AND ($5::bigint IS NULL OR t.position<$5::bigint)
        ORDER BY t.position DESC LIMIT $6`,
        [
          ...args,
          filters.status ?? null,
          filters.before ?? null,
          (filters.limit ?? 30) + 1,
        ],
      ),
      database().query<ActivityList["summary"]>(
        `SELECT count(*)::int AS total,
        count(*) FILTER(WHERE t.status='completed')::int AS completed,
        count(*) FILTER(WHERE t.status='failed')::int AS failed,
        count(*) FILTER(WHERE t.status IN ('queued','running'))::int AS active
        FROM agent_turns t JOIN projects p ON p.id=t.project_id WHERE ${where}`,
        args,
      ),
      database().query<{ id: string; name: string }>(
        "SELECT id,name FROM projects WHERE owner_id=$1 ORDER BY created_at DESC",
        [userId],
      ),
    ]);
    const selected = rows.rows.slice(0, filters.limit ?? 30);
    return {
      runs: selected.map(run),
      nextBefore:
        rows.rows.length > selected.length
          ? selected[selected.length - 1].position
          : null,
      projects: projects.rows,
      summary: totals.rows[0],
    };
  }

  async detail(
    userId: string,
    projectId: string,
    turnId: string,
  ): Promise<ActivityRunDetail> {
    if (![userId, projectId, turnId].every((id) => UUID.test(id)))
      throw new ChatTurnNotFoundError();
    const found = await database().query<RunRow>(
      `SELECT ${COLUMNS},t.response_text,
      t.context_snapshot->'researchMemory'->'decisions' AS recalled_decisions,
      t.context_snapshot->'dataset'->>'id' AS dataset_id,
      t.context_snapshot->'dataset'->>'artifactVersion' AS artifact_version,
      t.context_snapshot->'dataset'->>'title' AS dataset_name
      FROM agent_turns t JOIN projects p ON p.id=t.project_id WHERE t.id=$1 AND t.project_id=$2 AND t.owner_id=$3 AND p.owner_id=$3`,
      [turnId, projectId, userId],
    );
    const row = found.rows[0];
    if (!row) throw new ChatTurnNotFoundError();
    const [events, results] = await Promise.all([
      database().query<{
        id: string;
        position: string;
        span_id: string;
        parent_span_id: string | null;
        kind: ActivityEvent["kind"];
        phase: ActivityEvent["phase"];
        name: string;
        summary: string;
        data: ActivityData;
        created_at: Date;
      }>(
        `SELECT e.id,e.position::text,e.span_id,e.parent_span_id,e.kind,e.phase,e.name,e.summary,e.data,e.created_at
         FROM agent_activity_events e JOIN agent_turns t ON t.id=e.turn_id JOIN projects p ON p.id=t.project_id
         WHERE e.turn_id=$1 AND e.project_id=$2 AND e.owner_id=$3 AND t.project_id=$2 AND t.owner_id=$3 AND p.owner_id=$3
         ORDER BY e.position LIMIT 501`,
        [turnId, projectId, userId],
      ),
      database().query<{
        id: string;
        operation: string;
        summary: Record<string, unknown>;
        created_at: Date;
      }>(
        `SELECT a.id,a.operation,a.result->'summary' AS summary,a.created_at FROM analysis_runs a
         JOIN agent_turns t ON t.id=a.turn_id JOIN projects p ON p.id=t.project_id
         WHERE a.turn_id=$1 AND a.project_id=$2 AND a.owner_id=$3 AND t.project_id=$2 AND t.owner_id=$3 AND p.owner_id=$3 AND t.status='completed' AND NOT t.cancel_requested
         UNION ALL
         SELECT e.id,'marker_evidence' AS operation,'{}'::jsonb AS summary,e.created_at FROM marker_evidence_runs e
         JOIN agent_turns t ON t.id=e.turn_id JOIN projects p ON p.id=t.project_id
         WHERE e.turn_id=$1 AND e.project_id=$2 AND e.owner_id=$3 AND t.project_id=$2 AND t.owner_id=$3 AND p.owner_id=$3 AND t.status='completed' AND NOT t.cancel_requested
         ORDER BY created_at`,
        [turnId, projectId, userId],
      ),
    ]);
    if (events.rows.length > 500)
      throw new Error("Activity event limit exceeded");
    const terminal = new Set(["completed", "failed", "cancelled"]);
    const pairs = new Map<string, { start?: Date; end?: Date }>();
    for (const e of events.rows) {
      const pair = pairs.get(e.span_id) ?? {};
      if (e.phase === "started") pair.start = e.created_at;
      if (terminal.has(e.phase)) pair.end = e.created_at;
      pairs.set(e.span_id, pair);
    }
    const href = conversationHref(projectId, turnId, row.position);
    return {
      run: run(row),
      events: events.rows.map((e) => {
        const pair = pairs.get(e.span_id)!;
        return {
          id: e.id,
          position: e.position,
          spanId: e.span_id,
          parentSpanId: e.parent_span_id,
          kind: e.kind,
          phase: e.phase,
          name: e.name,
          summary: e.summary,
          data: validateActivityData(e.data),
          createdAt: e.created_at.toISOString(),
          interrupted:
            e.phase === "started" && !pair.end && terminal.has(row.status),
          durationMs:
            pair.start && pair.end
              ? Math.max(0, pair.end.getTime() - pair.start.getTime())
              : null,
        };
      }),
      response:
        row.status === "completed" && !row.cancel_requested && row.response_text
          ? { text: row.response_text, href }
          : null,
      results: results.rows.map((r) => ({
        id: r.id,
        operation: r.operation,
        title: TITLES[r.operation] ?? "Analysis result",
        summary: resultSummary(r.operation, r.summary ?? {}),
        href,
        createdAt: r.created_at.toISOString(),
      })),
      memory: await this.memory(userId, projectId, row.recalled_decisions),
      dataset:
        row.dataset_id && row.artifact_version
          ? {
              id: row.dataset_id,
              artifactVersion: row.artifact_version,
              ...(safeText(row.dataset_name, 300)
                ? { name: row.dataset_name! }
                : {}),
            }
          : null,
    };
  }

  private async memory(
    userId: string,
    projectId: string,
    values: unknown,
  ): Promise<ActivityRunDetail["memory"]> {
    if (!Array.isArray(values)) return [];
    const decisions = values
      .slice(0, 5)
      .filter(
        (v): v is { source: string; content: string } =>
          !!v &&
          typeof v === "object" &&
          typeof v.source === "string" &&
          /^(annotation-review|research-review):[a-f0-9-]{36}$/.test(
            v.source,
          ) &&
          UUID.test(v.source.split(":")[1]) &&
          typeof v.content === "string" &&
          v.content.length <= 16000,
      );
    if (!decisions.length) return [];
    const sources = await database().query<{
      source: string;
      href: string;
      saved_at: Date;
    }>(
      `SELECT 'annotation-review:'||r.id AS source,
         '/app/projects/'||p.id||'?chatBefore='||(t.position+1)||'#turn-'||t.id AS href,r.created_at AS saved_at
       FROM annotation_reviews r JOIN analysis_runs a ON a.id=r.run_id AND a.project_id=r.project_id AND a.owner_id=r.owner_id
       JOIN agent_turns t ON t.id=a.turn_id AND t.project_id=r.project_id AND t.owner_id=r.owner_id JOIN projects p ON p.id=r.project_id
       WHERE r.project_id=$1 AND r.owner_id=$2 AND p.owner_id=$2 AND t.status='completed' AND NOT t.cancel_requested
         AND ('annotation-review:'||r.id)=ANY($3::text[])
       UNION ALL
       SELECT 'research-review:'||r.id AS source,
         '/app/projects/'||p.id||'?before='||(r.position+1)||'#entry-'||r.id AS href,r.created_at AS saved_at
       FROM research_entries r JOIN projects p ON p.id=r.project_id
       JOIN research_entries m ON m.id=r.reference_entry_id AND m.project_id=r.project_id AND m.author_id=r.author_id AND m.kind='markers'
       WHERE r.project_id=$1 AND r.author_id=$2 AND p.owner_id=$2 AND r.kind IN ('manual_review','evidence_review')
         AND ('research-review:'||r.id)=ANY($3::text[])`,
      [projectId, userId, decisions.map((v) => v.source)],
    );
    return decisions.flatMap((v) => {
      const source = sources.rows.find((s) => s.source === v.source);
      return source
        ? [
            {
              source: v.source,
              content: v.content,
              href: source.href,
              savedAt: source.saved_at.toISOString(),
            },
          ]
        : [];
    });
  }
}
