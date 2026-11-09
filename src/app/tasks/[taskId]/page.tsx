import { MvpGate } from "@/components/mvp/mvp-gate";
import { TaskDetails } from "@/components/mvp/tasks";

export const dynamic = "force-dynamic";

export default async function TaskDetailsPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  return (
    <MvpGate>
      <TaskDetails taskId={taskId} />
    </MvpGate>
  );
}
