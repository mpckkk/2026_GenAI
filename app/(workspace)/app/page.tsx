import Link from "next/link";
import { redirect } from "next/navigation";
import { services } from "@/app/bootstrap";
import { GuidedStart } from "./guided-start";
import { NewExperiment } from "./new-experiment";
import { WorkspaceIcon } from "./workspace-icons";
import styles from "./experiments.module.css";

export default async function ExperimentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await services.auth.currentUser();
  if (!user) redirect("/login");
  const projects = await services.projects.list(user.id);
  const { error } = await searchParams;
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Experiments</h1>
          <p>
            {projects.length
              ? "Pick up where you left off, or start a new conversation."
              : "Your research conversations, in one place."}
          </p>
        </div>
        <NewExperiment error={error} />
      </header>
      <section aria-label="Your experiments" className={styles.saved}>
        {projects.length ? (
          <>
            <h2 className={styles.sectionTitle}>Continue your research</h2>
            <ul className={styles.experimentList}>
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    className={styles.experiment}
                    href={`/app/projects/${project.id}`}
                  >
                    <span className={styles.experimentIcon}>
                      <WorkspaceIcon name="flask" size={20} />
                    </span>
                    <span className={styles.experimentName}>
                      {project.name}
                    </span>
                    <span className={styles.continue}>
                      <span>Continue</span>
                      <WorkspaceIcon name="chevron" size={16} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <WorkspaceIcon name="chat" size={25} />
            </span>
            <h2>Start your first experiment</h2>
            <p>
              Create a conversation for your research, or try the soybean demo
              below.
            </p>
          </div>
        )}
      </section>
      <GuidedStart />
    </div>
  );
}
