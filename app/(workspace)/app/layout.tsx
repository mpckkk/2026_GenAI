import { redirect } from "next/navigation";
import { services } from "@/app/bootstrap";
import { WorkspaceShell } from "./workspace-shell";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await services.auth.currentUser();
  if (!user) redirect("/login");
  const projects = await services.projects.list(user.id);
  return (
    <WorkspaceShell projects={projects} displayName={user.displayName}>
      {children}
    </WorkspaceShell>
  );
}
