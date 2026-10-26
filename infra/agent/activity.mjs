import { randomUUID } from "node:crypto";
import { appendActivity } from "../../app/adapters/activity-events.mjs";

export const safeErrorCode = (error) =>
  typeof error?.code === "string" && /^[A-Za-z0-9_.:-]{1,100}$/.test(error.code)
    ? error.code
    : "agent_execution_failed";

/** Record operations at the interface boundary, independently of the runtime. */
export function activityFor(connection, turn) {
  const event = async (value) => {
    // A request admitted before migration has no complete trace. Do not pretend otherwise.
    if (turn.activity_version !== 1) return;
    await appendActivity(connection, {
      ownerId: turn.owner_id,
      projectId: turn.project_id,
      turnId: turn.id,
      ...value,
    });
  };
  const step = async (description, work, completed = () => ({})) => {
    const { data = {}, ...fields } = description;
    const spanId = fields.spanId ?? randomUUID();
    const base = { ...fields, spanId };
    await event({ ...base, phase: "started", data });
    const started = performance.now();
    try {
      const result = await work(spanId);
      const end = completed(result);
      await event({
        ...base,
        phase: "completed",
        summary: end.summary ?? `${base.name} completed.`,
        data: {
          ...data,
          ...end.data,
          durationMs: Math.round(performance.now() - started),
        },
      });
      return result;
    } catch (error) {
      const errorCode = safeErrorCode(error);
      const cancelled =
        errorCode === "cancelled" || errorCode.endsWith("_cancelled");
      await event({
        ...base,
        phase: cancelled ? "cancelled" : "failed",
        summary: cancelled
          ? `${base.name} was cancelled.`
          : `${base.name} did not finish.`,
        data: {
          ...data,
          errorCode,
          durationMs: Math.round(performance.now() - started),
        },
      });
      throw error;
    }
  };
  return { event, step };
}

export function referenceCompletion(source) {
  return {
    summary: source.delivery
      ? `Retrieved ${source.delivery.recordCount} marker associations from ${source.delivery.provider}; checked the reference checksum.`
      : "Loaded the verified published marker reference.",
    data: {
      reference: source.delivery ?? {
        provider: "Published reference",
        recordCount: source.records.length,
        contentSha256: source.contentSha256,
      },
      ...(source.reference?.id ? { sourceIds: [source.reference.id] } : {}),
    },
  };
}

export function analysisCompletion(saved) {
  const summary = saved.result.summary;
  const counts = { results: 1 };
  for (const [target, source] of Object.entries({
    clusters: "clusterCount",
    suggested: "suggestedCount",
    ambiguous: "ambiguousCount",
    unresolved: "unresolvedCount",
  }))
    if (Number.isSafeInteger(summary?.[source]))
      counts[target] = summary[source];
  return {
    summary:
      saved.result.operation === "annotation"
        ? `Saved annotations for ${counts.clusters} cell groups: ${counts.suggested} suggested, ${counts.ambiguous} ambiguous, ${counts.unresolved} unresolved.`
        : "Saved the scientific result and its method for the conversation.",
    data: { resultId: saved.id, outputCounts: counts },
  };
}
