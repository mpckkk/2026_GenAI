import Link from "next/link";
import { redirect } from "next/navigation";
import { services } from "@/app/bootstrap";
import { createProject } from "./actions";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await services.auth.currentUser();
  if (!user) redirect("/login");
  const projects = await services.projects.list(user.id);
  const { error } = await searchParams;
  return (
    <>
      <p className="eyebrow">Your research</p>
      <h1>Projects</h1>
      <p className="page-description">
        A place for each question, and the evidence that helps answer it.
      </p>
      <section className="panel create-project">
        <h2>Create a project</h2>
        <form action={createProject}>
          <div>
            <label htmlFor="project-name">Project name</label>
            <input
              id="project-name"
              name="name"
              placeholder="e.g. Soybean root nodule"
              required
              maxLength={120}
            />
            {error === "name" && (
              <p role="alert">Enter a name with 1–120 characters.</p>
            )}
          </div>
          <button className="button" type="submit">
            Create project ↗
          </button>
        </form>
      </section>
      <section aria-label="Your projects">
        {projects.length ? (
          <div className="project-grid">
            {projects.map((project) => (
              <Link
                className="project-tile"
                href={`/app/projects/${project.id}`}
                key={project.id}
              >
                <span className="eyebrow">Research project</span>
                <h2>{project.name}</h2>
                <span className="muted">Open project ↗</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">
              ✳
            </span>
            <h2>Your first project starts here.</h2>
            <p>
              Create a project to keep your analysis and its evidence together.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
