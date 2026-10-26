import { notFound, redirect } from "next/navigation";
import { services } from "@/app/bootstrap";
import { DatasetUpload } from "../dataset-upload";

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const user = await services.auth.currentUser();
  if (!user) redirect("/login");
  const { projectId } = await searchParams;
  const project = projectId
    ? await services.projects.findOwned(user.id, projectId)
    : null;
  if (projectId && !project) notFound();
  return <DatasetUpload initialProject={project} />;
}
