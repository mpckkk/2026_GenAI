import Link from "next/link";
import type { ActivityRunDetail } from "@/app/core/activity";
import { WorkspaceIcon } from "../workspace-icons";
import { durationLabel, Status } from "./activity-dashboard";
import {
  revealStep,
  sponsorForStep,
  sponsors,
  stepHref,
  stepStatus,
  timeOfDay,
  type Sponsor,
  type Step,
} from "./activity-steps";
import styles from "./activity.module.css";

function callPurpose(step: Step, steps: Step[]) {
  if (step.first.kind === "memory") return "Look for earlier decisions";
  if (step.first.kind === "model")
    return step.data.operation === "investigation"
      ? "Compare evidence interpretations"
      : "Work on the answer";
  const parent = steps.find((entry) => entry.id === step.first.parentSpanId);
  if (parent?.first.kind === "tool")
    return parent.data.operation === "annotation"
      ? "Get evidence for naming cell groups"
      : "Get evidence for the gene comparison";
  return step.first.name === "Check marker reference"
    ? "Check the published gene list"
    : "Prepare the gene reference";
}

function outcome(sponsor: Sponsor, step: Step, detail: ActivityRunDetail) {
  const status = stepStatus(step, detail.run);
  if (status === "running") return "In progress";
  if (status === "failed") return "This step failed";
  if (status === "cancelled") return "This step was cancelled";
  if (status === "interrupted") return "Outcome not recorded";
  if (status !== "completed") return "Step recorded";
  if (sponsor === "zetaris") {
    const count = step.data.reference?.recordCount;
    return count === undefined
      ? "Reference check finished"
      : `${count} reference entries retrieved`;
  }
  if (sponsor === "nightshift")
    return `${step.data.outputCounts?.attempts ?? 3} interpretations received`;
  if (sponsor === "hmem") {
    const count = step.data.memoryCount;
    return count === undefined
      ? "Earlier decisions checked"
      : count === 0
        ? "No earlier decisions matched"
        : `${count} earlier ${count === 1 ? "decision" : "decisions"} found`;
  }
  return step.data.decision === "Return answer"
    ? "Answer returned"
    : step.data.decision?.startsWith("Request ")
      ? "Next analysis requested"
      : "Agent step finished";
}

function roleDescription(sponsor: Sponsor, step: Step, steps: Step[]) {
  if (sponsor === "nightshift")
    return "Compares three interpretations of the same measurements, evaluates their quality and preserves disagreement for review.";
  if (sponsor === "hmem")
    return "Finds decisions already recorded in this experiment, so the agent can refer back to them.";
  if (sponsor === "openshell")
    return "Runs the agent in a separate, restricted environment while it works on your question.";
  const parent = steps.find((entry) => entry.id === step.first.parentSpanId);
  return parent?.first.kind === "tool"
    ? "Each entry links a gene to a possible cell type. This analysis uses those links as evidence for naming cell groups."
    : "Loads the published list of genes linked to possible cell types, ready for the agent to use.";
}

function SponsorCard({
  sponsor,
  steps,
  detail,
}: {
  sponsor: Sponsor;
  steps: Step[];
  detail: ActivityRunDetail;
}) {
  const brand = sponsors[sponsor];
  const calls = steps.filter((step) => sponsorForStep(step) === sponsor);
  // Surface unfinished/failed work before successful work. Otherwise show the
  // latest real operation, not a sum of repeatedly loaded reference rows.
  const primary =
    calls.find((step) =>
      ["running", "failed", "interrupted", "cancelled"].includes(
        stepStatus(step, detail.run),
      ),
    ) ?? calls.at(-1);
  const status = primary ? stepStatus(primary, detail.run) : null;
  const completed = status === "completed";
  const parent = primary
    ? steps.find((step) => step.id === primary.first.parentSpanId)
    : undefined;
  const result = completed
    ? detail.results.find((entry) => entry.id === parent?.data.resultId)
    : undefined;
  const memories = completed
    ? detail.memory.filter((entry) =>
        primary?.data.sourceIds?.includes(entry.source),
      )
    : [];
  const duration = primary?.last.durationMs ?? primary?.data.durationMs;
  return (
    <article
      className={styles.sponsorCard}
      data-sponsor={sponsor}
      data-empty={!primary}
      aria-label={brand.name}
    >
      <div className={styles.sponsorBrand}>
        <span className={styles.sponsorIcon}>
          <WorkspaceIcon name={brand.icon} size={17} />
        </span>
        <div>
          <h3>{brand.name}</h3>
          <p>{brand.role}</p>
        </div>
      </div>
      {primary ? (
        <>
          <h4 className={styles.sponsorOutcome}>
            {outcome(sponsor, primary, detail)}
          </h4>
          <p className={styles.sponsorDescription}>
            {roleDescription(sponsor, primary, steps)}
          </p>
          <div className={styles.sponsorEvidence}>
            {sponsor === "nightshift" && primary.data.providerJobId && (
              <span>
                Job: <code>{primary.data.providerJobId}</code>
              </span>
            )}
            {completed &&
              sponsor === "zetaris" &&
              primary.data.reference?.contentSha256 && (
                <span>Source version checked</span>
              )}
            {result && (
              <Link href={result.href}>
                Open the analysis that used this evidence ↗
              </Link>
            )}
            {memories.length > 0 && (
              <Link href={memories[0].href}>
                Open original decision
                {memories.length > 1
                  ? ` · ${memories.length} decisions in step`
                  : ""}{" "}
                ↗
              </Link>
            )}
            {completed && sponsor === "openshell" && (
              <span>
                {primary.data.model
                  ? `Model: ${primary.data.model}`
                  : "Time includes starting the environment and running the agent"}
              </span>
            )}
          </div>
          <div className={styles.sponsorTiming}>
            <Status status={status!} />
            <span>
              Started{" "}
              <time dateTime={primary.first.createdAt}>
                {timeOfDay(primary.first.createdAt)}
              </time>
              {duration !== undefined && <> · {durationLabel(duration)}</>}
            </span>
          </div>
          <a
            className={styles.sponsorReceipt}
            href={stepHref(primary)}
            onClick={() => revealStep(primary)}
          >
            {sponsor === "zetaris"
              ? "See source check"
              : sponsor === "hmem"
                ? "See earlier decisions"
                : "See agent step"}
            <span aria-hidden="true">↓</span>
          </a>
          {calls.length > 1 && (
            <details className={styles.sponsorCalls}>
              <summary>{calls.length} steps in this request</summary>
              <ol aria-label={`${brand.name} steps`}>
                {calls.map((call) => (
                  <li key={call.id}>
                    <a href={stepHref(call)} onClick={() => revealStep(call)}>
                      <span>{callPurpose(call, steps)}</span>
                      <span>
                        <time dateTime={call.first.createdAt}>
                          {timeOfDay(call.first.createdAt)}
                        </time>
                        <Status status={stepStatus(call, detail.run)} />
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </>
      ) : (
        <div className={styles.sponsorAbsent}>
          <h4>No use recorded</h4>
          <p>This request has no recorded use of {brand.name}.</p>
        </div>
      )}
    </article>
  );
}

export function SponsorActivity({
  steps,
  detail,
}: {
  steps: Step[];
  detail: ActivityRunDetail;
}) {
  const visible: Sponsor[] = ["zetaris", "hmem"];
  if (steps.some((step) => sponsorForStep(step) === "nightshift"))
    visible.push("nightshift");
  if (steps.some((step) => sponsorForStep(step) === "openshell"))
    visible.push("openshell");
  return (
    <section className={styles.section} aria-labelledby="sponsors-heading">
      <div className={styles.sponsorHeading}>
        <div>
          <h2 id="sponsors-heading">Tools used</h2>
          <p>What each service contributed, with links to the work it did.</p>
        </div>
        <span>Times in {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
      </div>
      <div className={styles.sponsorGrid}>
        {visible.map((sponsor) => (
          <SponsorCard
            key={sponsor}
            sponsor={sponsor}
            steps={steps}
            detail={detail}
          />
        ))}
      </div>
    </section>
  );
}
