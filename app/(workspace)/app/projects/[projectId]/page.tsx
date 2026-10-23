import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { services } from "@/app/bootstrap";
import { ResearchValidationError } from "@/app/core/errors";
import type { ResearchWorkspace } from "@/app/core/research";
import { ConversationComposer } from "../../conversation-composer";
import { ContextDetails, ConversationEntry } from "../../conversation-entry";
import styles from "../../workspace.module.css";

export default async function ExperimentPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ before?: string | string[] }>;
}) {
  const { projectId } = await params;
  const { before } = await searchParams;
  const user = await services.auth.currentUser();
  if (!user)
    redirect(
      `/login?returnTo=${encodeURIComponent(`/app/projects/${projectId}`)}`,
    );
  const project = await services.projects.findOwned(user.id, projectId);
  if (!project) notFound();
  let workspace: ResearchWorkspace;
  try {
    if (Array.isArray(before))
      throw new ResearchValidationError({
        before: "Use one conversation page cursor.",
      });
    workspace = await services.research.workspace(user.id, projectId, before);
  } catch (error) {
    if (!(error instanceof ResearchValidationError)) throw error;
    return (
      <div className={styles.conversationPage}>
        <h1>That history page could not be opened.</h1>
        <p className={styles.pageDescription}>
          The conversation address contains an invalid history cursor.
        </p>
        <Link className={styles.backLink} href={`/app/projects/${projectId}`}>
          Return to the latest conversation
        </Link>
      </div>
    );
  }
  const plants = services.plants.list();
  const currentContext = workspace.context?.context;
  const currentPlant = currentContext
    ? plants.find((plant) => plant.id === currentContext.speciesId)
    : null;
  return (
    <div className={styles.conversationPage}>
      <Link className={styles.backLink} href="/app">
        ← All experiments
      </Link>
      <header className={styles.conversationHeading}>
        <div>
          <p className={styles.eyebrow}>Single-cell experiment</p>
          <h1>{project.name}</h1>
        </div>
        <span className={styles.tag}>Experiment saved</span>
      </header>
      {currentContext ? (
        <details className={styles.contextSummary}>
          <summary>
            <span className={styles.summaryLabel}>Current sample</span>
            <span>
              {currentPlant?.commonName ?? currentContext.speciesId}
              {currentContext.tissue ? ` · ${currentContext.tissue}` : ""}
              {currentContext.sampleLabel
                ? ` · ${currentContext.sampleLabel}`
                : ""}
            </span>
            <span className={styles.smallMuted}>Details</span>
          </summary>
          <ContextDetails context={currentContext} plants={plants} />
        </details>
      ) : (
        <div className={styles.contextSummary}>
          <p>
            <strong>Sample context</strong>{" "}
            <span className={styles.smallMuted}>
              Not added yet. Add it below when you are ready.
            </span>
          </p>
        </div>
      )}
      <div className={styles.systemNotice}>
        <span className={styles.systemLabel}>System</span>
        <p>
          Notes, markers and your reviews are saved here. AI analysis and
          reference lookup are not connected yet.{" "}
          <Link href="/app/health">View service status</Link>
        </p>
      </div>
      <section className={styles.thread} aria-labelledby="conversation-heading">
        <div className={styles.threadHeading}>
          <h2 id="conversation-heading">Conversation</h2>
          {before && (
            <Link href={`/app/projects/${projectId}`}>
              Back to latest entries →
            </Link>
          )}
        </div>
        {workspace.page.nextBefore && (
          <Link
            className={styles.olderLink}
            href={`/app/projects/${projectId}?before=${encodeURIComponent(workspace.page.nextBefore)}`}
          >
            View older entries
          </Link>
        )}
        {workspace.page.entries.length ? (
          <ol className={styles.entries}>
            {workspace.page.entries.map((entry) => (
              <ConversationEntry
                key={entry.id}
                entry={entry}
                plants={plants}
                markers={workspace.markers}
              />
            ))}
          </ol>
        ) : (
          <div className={styles.emptyConversation}>
            <h3>
              {before
                ? "No entries on this history page."
                : "What are you investigating?"}
            </h3>
            <p>
              {before
                ? "Return to the latest conversation to continue."
                : "Start with a note, add your sample context, or paste a cluster’s markers. Each entry stays with this experiment."}
            </p>
          </div>
        )}
      </section>
      <ConversationComposer
        projectId={projectId}
        plants={plants}
        context={workspace.context}
        markers={workspace.markers}
      />
    </div>
  );
}
