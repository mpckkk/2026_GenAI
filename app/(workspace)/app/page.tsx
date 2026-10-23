import Link from "next/link";
import { redirect } from "next/navigation";
import { services } from "@/app/bootstrap";
import { createProject } from "./actions";
import styles from "./workspace.module.css";

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
    <div className={styles.experiments}>
      <header className={styles.pageHeading}>
        <p className={styles.eyebrow}>Your single-cell research</p>
        <h1>Experiments</h1>
        <p>
          Keep sample context, markers and your annotation decisions in one
          conversation.
        </p>
      </header>
      <section className={styles.createPanel} aria-labelledby="create-heading">
        <h2 id="create-heading">Start an experiment</h2>
        <form action={createProject} className={styles.createForm}>
          <div className={styles.field}>
            <label htmlFor="project-name">Experiment name</label>
            <input
              id="project-name"
              name="name"
              placeholder="e.g. Soybean root nodule"
              required
              maxLength={120}
              aria-invalid={error === "name" || undefined}
              aria-describedby={error === "name" ? "name-error" : undefined}
            />
            {error === "name" && (
              <p id="name-error" role="alert" className={styles.errorText}>
                Enter a name with 1–120 characters.
              </p>
            )}
          </div>
          <button className={styles.primaryButton} type="submit">
            Create experiment
          </button>
        </form>
      </section>
      <section
        aria-label="Your experiments"
        className={styles.savedExperiments}
      >
        {projects.length ? (
          <div className={styles.experimentGrid}>
            {projects.map((project) => (
              <Link
                className={styles.experimentCard}
                href={`/app/projects/${project.id}`}
                key={project.id}
              >
                <p className={styles.eyebrow}>Experiment</p>
                <h2>{project.name}</h2>
                <span>
                  Open conversation <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.emptyExperiments}>
            <h2>Your research starts here.</h2>
            <p>
              Create an experiment, then add a note or your first set of
              markers.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
