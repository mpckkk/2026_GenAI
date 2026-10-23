import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { services } from "@/app/bootstrap";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await services.auth.currentUser();
  if (!user)
    redirect(
      `/login?returnTo=${encodeURIComponent(`/app/projects/${projectId}`)}`,
    );
  const project = await services.projects.findOwned(user.id, projectId);
  if (!project) notFound();
  return (
    <>
      <Link className="text-link" href="/app">
        ← All projects
      </Link>
      <div className="project-heading">
        <p className="eyebrow">Research project</p>
        <h1>{project.name}</h1>
        <span className="pill">Project saved</span>
      </div>
      <div className="project-columns">
        <section className="panel">
          <h2>Analysis</h2>
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">
              ✳
            </span>
            <h3>Your project is ready.</h3>
            <p>
              Cell annotation will be available once the marker sources and
              analysis services are connected.
            </p>
            <Link className="text-link" href="/app/health">
              View service status ↗
            </Link>
          </div>
        </section>
        <aside className="panel">
          <h2>Project assets</h2>
          <p className="muted">
            No files yet. Uploads will be available when file storage is
            connected.
          </p>
        </aside>
      </div>
    </>
  );
}
