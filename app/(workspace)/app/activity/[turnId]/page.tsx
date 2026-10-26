import { ActivityRun } from "../activity-run";

export default async function ActivityRunPage({
  params,
}: {
  params: Promise<{ turnId: string }>;
}) {
  const { turnId } = await params;
  return <ActivityRun turnId={turnId} />;
}
