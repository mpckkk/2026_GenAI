import { setTimeout as delay } from "node:timers/promises";
import { NightshiftClient, NightshiftError } from "./nightshift.mjs";
import {
  investigationInstructions,
  parseInvestigationAssessment,
} from "../core/investigation.mjs";

const jobIdValid = (v) =>
  typeof v === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(v);
const terminal = new Set(["completed", "errored", "failed", "cancelled"]);
const rubric = `# Faithful interpretation of cell-type evidence
## Must
- Return exactly the JSON contract requested in the system instruction, including a comparison for every supplied candidate.
- Use only supplied evidence IDs and measured values. Do not invent genes, sources, numerical values, or completed checks.
- Allow an unresolved recommendation. Never equate agreement or marker co-detection with biological validation, confidence, or doublet detection.
- Distinguish the original computed annotation, a model interpretation, and a proposed next check.
## Should
- Explain both support and weaknesses, including related cell identities and reference limitations, without assuming mutually exclusive candidates.
- Recommend a concrete next check and explain what uncertainty it addresses.
## Could
- Keep the explanation concise and understandable to a researcher reviewing the evidence.`;

/** Native Nightshift job API. It never replaces the conversation runtime. */
export class NightshiftInvestigation {
  constructor() {
    this.client = new NightshiftClient();
  }
  async cancel(jobId) {
    if (!jobIdValid(jobId)) throw new NightshiftError("nightshift_invalid_job");
    const state = await this.client.request(`/jobs/${jobId}`);
    if (!terminal.has(state.status))
      await this.client.request(`/jobs/${jobId}/cancel`, { body: {} });
  }
  async run({ packet, signal, onSubmitted, progress }) {
    if (process.env.CELLORAS_INVESTIGATION_ENABLED !== "true")
      throw new NightshiftError("investigation_unconfigured");
    if (signal?.aborted) throw new NightshiftError("cancelled");
    await this.client.health();
    if (signal?.aborted) throw new NightshiftError("cancelled");
    const deadline = Date.now() + 360000;
    let jobId;
    {
      let submitted;
      try {
        submitted = await this.client.request("/jobs", {
          timeout: 30000,
          signal,
          body: {
            kind: "best_of_n",
            app: "celloras-investigation",
            title: "Compare cell-type evidence",
            window: "now",
            n: 3,
            deadline: new Date(deadline).toISOString(),
            privacy: "cloud-ok",
            selector: "verifier_panel",
            judge_mode: "quality",
            judge_options: { rubric_text: rubric, stop_when_met: 0 },
            attempt_budget: { level: "low" },
            diversity: {
              level: "low",
              axes: { synthesis: false, briefs: false },
            },
            cut_resume: false,
            messages: [
              { role: "system", content: investigationInstructions },
              { role: "user", content: JSON.stringify(packet) },
            ],
          },
        });
      } catch (error) {
        // A rejected 4xx did not admit a job. A timeout/5xx may have: never POST again.
        if (!(error.status >= 400 && error.status < 500))
          throw new NightshiftError("investigation_submission_unknown");
        throw error;
      }
      if (!jobIdValid(submitted.id))
        throw new NightshiftError("investigation_submission_unknown");
      jobId = submitted.id;
      try {
        await onSubmitted(jobId);
      } catch (error) {
        try {
          await this.cancel(jobId);
        } catch {
          throw new NightshiftError("investigation_submission_unknown");
        }
        throw error;
      }
    }
    if (!jobIdValid(jobId)) throw new NightshiftError("nightshift_invalid_job");
    try {
      for (;;) {
        if (signal?.aborted) throw new NightshiftError("cancelled");
        if (Date.now() >= deadline)
          throw new NightshiftError("investigation_timeout");
        const job = await this.client.request(`/jobs/${jobId}`, { signal });
        if (
          job.id !== jobId ||
          job.kind !== "best_of_n" ||
          job.app !== "celloras-investigation" ||
          job.n !== 3
        )
          throw new NightshiftError("investigation_job_mismatch");
        if (terminal.has(job.status)) {
          if (job.status !== "completed")
            throw new NightshiftError(
              job.status === "cancelled"
                ? "cancelled"
                : job.error_code === "no_ready_lane"
                  ? "nightshift_no_ready_lane"
                  : "investigation_provider_failed",
            );
          if (
            job.partial ||
            job.failed ||
            job.judge_skipped ||
            job.generated !== 3
          )
            throw new NightshiftError("investigation_incomplete");
          const attempts = [];
          for (let sequence = 1; sequence <= 3; sequence++) {
            const item = await this.client.request(
              `/jobs/${jobId}/attempts/${sequence}`,
              { signal },
            );
            if (
              item.seq !== sequence ||
              typeof item.text !== "string" ||
              item.truncated
            )
              throw new NightshiftError("investigation_invalid_response");
            attempts.push({
              sequence,
              model:
                typeof item.model === "string" &&
                /^[A-Za-z0-9/_.:@-]{1,200}$/.test(item.model)
                  ? item.model
                  : null,
              assessment: parseInvestigationAssessment(item.text, packet),
            });
          }
          const selectedAttempt =
            job.winner_seq === null ? null : job.winner_seq;
          if (
            selectedAttempt !== null &&
            !attempts.some((a) => a.sequence === selectedAttempt)
          )
            throw new NightshiftError("investigation_invalid_response");
          return { jobId, attempts, selectedAttempt };
        }
        progress(
          job.status === "queued"
            ? "Evidence review queued"
            : `Comparing interpretations (${Math.min(job.generated || 0, 3)} of 3)`,
        );
        await delay(2000, undefined, { signal });
      }
    } catch (error) {
      try {
        await this.cancel(jobId);
      } catch {
        throw new NightshiftError("investigation_cleanup_required");
      }
      if (signal?.aborted) throw new NightshiftError("cancelled");
      throw error;
    }
  }
}
