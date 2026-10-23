import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { services } from "@/app/bootstrap";
import { ResearchValidationError } from "@/app/core/errors";
import { ChatValidationError, type ChatWorkspace } from "@/app/core/chat";
import type { ResearchWorkspace } from "@/app/core/research";
import { ExperimentWorkspace } from "../../experiment-workspace";
import styles from "../../workspace.module.css";

export default async function ExperimentPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    before?: string | string[];
    chatBefore?: string | string[];
  }>;
}) {
  const { projectId } = await params;
  const { before, chatBefore } = await searchParams;
  const user = await services.auth.currentUser();
  if (!user)
    redirect(
      `/login?returnTo=${encodeURIComponent(`/app/projects/${projectId}`)}`,
    );
  const project = await services.projects.findOwned(user.id, projectId);
  if (!project) notFound();
  let workspace: ResearchWorkspace;
  let chat: ChatWorkspace;
  try {
    if (Array.isArray(before) || Array.isArray(chatBefore))
      throw new ResearchValidationError({
        before: "Use one conversation page cursor.",
      });
    workspace = await services.research.workspace(user.id, projectId, before);
    chat = await services.chat.workspace(user.id, projectId, chatBefore);
  } catch (error) {
    if (
      !(error instanceof ResearchValidationError) &&
      !(error instanceof ChatValidationError)
    )
      throw error;
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
  return (
    <ExperimentWorkspace
      key={`${projectId}:${chatBefore ?? "latest"}`}
      project={project}
      chat={chat}
      research={workspace}
      plants={plants}
      before={before}
    />
  );
}
