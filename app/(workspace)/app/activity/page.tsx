import { ActivityDashboard } from "./activity-dashboard";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { projectId } = await searchParams;
  return <ActivityDashboard initialProjectId={projectId ?? ""} />;
}
