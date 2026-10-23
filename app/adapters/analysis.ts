import "server-only";
import { database } from "./database";
import type { ScientificData } from "../core/scientific-data";
import { AnalysisError, analysisRun } from "../core/analysis.mjs";
import type {
  AnalysisWorkspace,
  AnalysisReview,
  AnalysisRepository,
} from "../core/analysis";
import type { AnnotationReview } from "../core/annotation";

import { ChatSubmissionConflictError } from "../core/chat";
import { ProjectNotFoundError } from "../core/errors";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEMO = "gse270392-root-rna-v1";
async function requireOwner(userId: string, projectId: string) {
  if (!UUID.test(userId) || !UUID.test(projectId))
    throw new ProjectNotFoundError();
  const owned = await database().query(
    "SELECT id FROM projects WHERE id=$1 AND owner_id=$2",
    [projectId, userId],
  );
  if (!owned.rows[0]) throw new ProjectNotFoundError();
}
export class PostgresAnalysis implements AnalysisRepository {
  constructor(private readonly data: ScientificData) {}
  async workspace(
    userId: string,
    projectId: string,
  ): Promise<AnalysisWorkspace> {
    await requireOwner(userId, projectId);
    const attached = await database().query(
      "SELECT dataset_id,artifact_version FROM project_datasets WHERE project_id=$1",
      [projectId],
    );
    if (!attached.rows[0])
      return {
        dataset: null,
        available: false,
        reason:
          "This experiment has no dataset attached. Open the soybean root demo to explore real cells.",
      };
    try {
      const dataset = (await this.data.catalog()).find(
        (d) =>
          d.id === attached.rows[0].dataset_id &&
          d.artifactVersion === attached.rows[0].artifact_version,
      );
      if (!dataset) throw new AnalysisError("scientific_data_unavailable");
      return { dataset, available: true };
    } catch {
      return {
        dataset: null,
        available: false,
        reason:
          "The attached dataset is temporarily unavailable. Your conversation and saved results are still here.",
      };
    }
  }
  async startDemo(userId: string) {
    const dataset = (await this.data.catalog()).find((d) => d.id === DEMO);
    if (!dataset) throw new AnalysisError("scientific_data_unavailable");
    const c = await database().connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        `demo:${userId}:${DEMO}`,
      ]);
      const existing = await c.query(
        `SELECT p.id FROM demo_projects d JOIN projects p ON p.id=d.project_id WHERE d.owner_id=$1 AND d.demo_key=$2 AND p.owner_id=$1`,
        [userId, DEMO],
      );
      let projectId = existing.rows[0]?.id as string | undefined;
      if (!projectId) {
        const created = await c.query<{ id: string }>(
          "INSERT INTO projects(owner_id,name) VALUES($1,$2) RETURNING id",
          [userId, "Soybean root · real cells"],
        );
        projectId = created.rows[0].id;
        await c.query(
          "INSERT INTO project_datasets(project_id,dataset_id,artifact_version) VALUES($1,$2,$3)",
          [projectId, DEMO, dataset.artifactVersion],
        );
        await c.query(
          "INSERT INTO demo_projects(owner_id,demo_key,project_id) VALUES($1,$2,$3)",
          [userId, DEMO, projectId],
        );
      }
      await c.query("COMMIT");
      console.info(
        JSON.stringify({ event: "demo.opened", projectId, datasetId: DEMO }),
      );
      return { projectId, url: `/app/projects/${projectId}` };
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  async get(userId: string, projectId: string, runId: string) {
    await requireOwner(userId, projectId);
    if (!UUID.test(runId)) throw new ProjectNotFoundError();
    const found = await database().query(
      `SELECT a.* FROM analysis_runs a JOIN projects p ON p.id=a.project_id JOIN agent_turns t ON t.id=a.turn_id
      WHERE a.project_id=$1 AND a.owner_id=$2 AND p.owner_id=$2 AND a.id=$3 AND t.project_id=$1 AND t.owner_id=$2 AND t.status='completed' AND NOT t.cancel_requested`,
      [projectId, userId, runId],
    );
    if (!found.rows[0]) throw new ProjectNotFoundError();
    const reviews = await database().query(
      "SELECT * FROM analysis_reviews WHERE project_id=$1 AND owner_id=$2 AND run_id=$3 ORDER BY created_at DESC LIMIT 20",
      [projectId, userId, runId],
    );
    const annotationReviews = await database().query(
      `SELECT * FROM (
        SELECT r.*,row_number() OVER(PARTITION BY cluster ORDER BY created_at DESC,id DESC) AS review_order
        FROM annotation_reviews r WHERE project_id=$1 AND owner_id=$2 AND run_id=$3
      ) ranked WHERE review_order<=5 ORDER BY created_at DESC,id DESC`,
      [projectId, userId, runId],
    );
    return {
      ...analysisRun(found.rows[0], true),
      reviews: reviews.rows.map(review),
      annotationReviews: annotationReviews.rows.map(annotationReview),
    };
  }
  async review(
    userId: string,
    projectId: string,
    runId: string,
    input: unknown,
  ) {
    runId = runId.toLowerCase();
    const run = await this.get(userId, projectId, runId);
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new AnalysisError("analysis_input_invalid");
    const v = input as Record<string, unknown>;
    if (
      typeof v.submissionId !== "string" ||
      !UUID.test(v.submissionId) ||
      Object.keys(v).some(
        (k) => !["submissionId", "decision", "note", "cluster"].includes(k),
      ) ||
      typeof v.decision !== "string" ||
      !["supported", "uncertain", "rejected"].includes(v.decision) ||
      typeof v.note !== "string" ||
      !v.note.trim() ||
      v.note.length > 4000 ||
      /\0|[\uD800-\uDFFF]/u.test(v.note) ||
      (v.cluster !== undefined &&
        (typeof v.cluster !== "string" ||
          !/^[A-Za-z0-9_.-]{1,64}$/.test(v.cluster)))
    )
      throw new AnalysisError("analysis_input_invalid");
    if (v.cluster !== undefined) {
      const result = run.result;
      if (
        !("operation" in result) ||
        result.operation !== "markers" ||
        !("payload" in result) ||
        result.payload.cluster !== v.cluster
      )
        throw new AnalysisError("analysis_input_invalid");
    }
    const c = await database().connect();
    try {
      await c.query("BEGIN");
      await c.query(
        "SELECT id FROM projects WHERE id=$1 AND owner_id=$2 FOR UPDATE",
        [projectId, userId],
      );
      const existing = await c.query(
        "SELECT * FROM analysis_reviews WHERE project_id=$1 AND owner_id=$2 AND submission_id=$3",
        [projectId, userId, v.submissionId],
      );
      if (existing.rows[0]) {
        const r = existing.rows[0];
        if (
          r.run_id !== runId ||
          r.decision !== v.decision ||
          r.note !== v.note.trim() ||
          r.cluster !== (v.cluster ?? null)
        )
          throw new ChatSubmissionConflictError();
        await c.query("COMMIT");
        return { review: review(r) };
      }
      const saved = await c.query(
        `INSERT INTO analysis_reviews(project_id,owner_id,run_id,submission_id,decision,note,cluster)
        SELECT p.id,$2,a.id,$4,$5,$6,$7 FROM projects p JOIN analysis_runs a ON a.project_id=p.id JOIN agent_turns t ON t.id=a.turn_id
        WHERE p.id=$1 AND p.owner_id=$2 AND a.owner_id=$2 AND a.id=$3 AND t.status='completed' AND NOT t.cancel_requested RETURNING *`,
        [
          projectId,
          userId,
          runId,
          v.submissionId,
          v.decision,
          v.note.trim(),
          v.cluster ?? null,
        ],
      );
      if (!saved.rows[0]) throw new ProjectNotFoundError();
      await c.query("COMMIT");
      console.info(
        JSON.stringify({
          event: "analysis.review.saved",
          projectId,
          runId,
          reviewId: saved.rows[0].id,
        }),
      );
      return { review: review(saved.rows[0]) };
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  async reviewAnnotation(
    userId: string,
    projectId: string,
    runId: string,
    input: unknown,
  ): Promise<{ review: AnnotationReview }> {
    runId = runId.toLowerCase();
    const run = await this.get(userId, projectId, runId);
    if (!("operation" in run.result) || run.result.operation !== "annotation")
      throw new AnalysisError("analysis_input_invalid");
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new AnalysisError("analysis_input_invalid");
    const v = input as Record<string, unknown>;
    if (
      Object.keys(v).some(
        (key) =>
          !["submissionId", "cluster", "decision", "cellType", "note"].includes(
            key,
          ),
      ) ||
      typeof v.submissionId !== "string" ||
      !UUID.test(v.submissionId) ||
      typeof v.cluster !== "string" ||
      !/^[A-Za-z0-9_.-]{1,64}$/.test(v.cluster) ||
      typeof v.decision !== "string" ||
      !["accepted", "corrected", "unresolved", "rejected"].includes(
        v.decision,
      ) ||
      typeof v.note !== "string" ||
      !v.note.trim() ||
      v.note.length > 4000 ||
      /\0|[\uD800-\uDFFF]/u.test(v.note)
    )
      throw new AnalysisError("analysis_input_invalid");
    const cluster = run.result.payload.clusters.find(
      (item) => item.cluster === v.cluster,
    );
    if (!cluster) throw new AnalysisError("analysis_input_invalid");
    let cellType: string | null = null;
    if (v.decision === "accepted" || v.decision === "corrected") {
      if (
        typeof v.cellType !== "string" ||
        !v.cellType.trim() ||
        v.cellType.length > 200 ||
        /\0|[\uD800-\uDFFF]/u.test(v.cellType)
      )
        throw new AnalysisError("analysis_input_invalid");
      cellType = v.cellType.trim();
      if (
        v.decision === "accepted" &&
        !cluster.candidates.some((candidate) => candidate.cellType === cellType)
      )
        throw new AnalysisError("analysis_input_invalid");
    } else if (v.cellType !== null && v.cellType !== undefined) {
      throw new AnalysisError("analysis_input_invalid");
    }
    const c = await database().connect();
    try {
      await c.query("BEGIN");
      await c.query(
        "SELECT id FROM projects WHERE id=$1 AND owner_id=$2 FOR UPDATE",
        [projectId, userId],
      );
      const existing = await c.query(
        "SELECT * FROM annotation_reviews WHERE project_id=$1 AND owner_id=$2 AND submission_id=$3",
        [projectId, userId, v.submissionId],
      );
      if (existing.rows[0]) {
        const r = existing.rows[0];
        if (
          r.run_id !== runId ||
          r.cluster !== v.cluster ||
          r.decision !== v.decision ||
          r.cell_type !== cellType ||
          r.note !== v.note.trim()
        )
          throw new ChatSubmissionConflictError();
        await c.query("COMMIT");
        return { review: annotationReview(r) };
      }
      const saved = await c.query(
        `INSERT INTO annotation_reviews(project_id,owner_id,run_id,submission_id,cluster,decision,cell_type,note)
        SELECT p.id,$2,a.id,$4,$5,$6,$7,$8 FROM projects p
        JOIN analysis_runs a ON a.project_id=p.id JOIN agent_turns t ON t.id=a.turn_id
        WHERE p.id=$1 AND p.owner_id=$2 AND a.owner_id=$2 AND a.id=$3 AND a.operation='annotation'
          AND t.project_id=$1 AND t.owner_id=$2 AND t.status='completed' AND NOT t.cancel_requested RETURNING *`,
        [
          projectId,
          userId,
          runId,
          v.submissionId,
          v.cluster,
          v.decision,
          cellType,
          v.note.trim(),
        ],
      );
      if (!saved.rows[0]) throw new ProjectNotFoundError();
      await c.query("COMMIT");
      console.info(
        JSON.stringify({
          event: "annotation.review.saved",
          projectId,
          runId,
          reviewId: saved.rows[0].id,
          decision: v.decision,
        }),
      );
      return { review: annotationReview(saved.rows[0]) };
    } catch (error) {
      await c.query("ROLLBACK");
      throw error;
    } finally {
      c.release();
    }
  }
}
function review(row: Record<string, unknown>): AnalysisReview {
  return {
    id: row.id as string,
    runId: row.run_id as string,
    decision: row.decision as AnalysisReview["decision"],
    note: row.note as string,
    cluster: row.cluster as string | null,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}
function annotationReview(row: Record<string, unknown>): AnnotationReview {
  return {
    id: row.id as string,
    runId: row.run_id as string,
    cluster: row.cluster as string,
    decision: row.decision as AnnotationReview["decision"],
    cellType: row.cell_type as string | null,
    note: row.note as string,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}
