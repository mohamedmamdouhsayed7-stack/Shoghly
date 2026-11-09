import { AdminTaskManager } from "@/components/mvp/tasks";
import { MvpGate } from "@/components/mvp/mvp-gate";

export const dynamic = "force-dynamic";
export const metadata = { title: "إدارة المهام | شغلني" };

export default function AdminTasksPage() {
  return (
    <MvpGate permission="task.manage.write">
      <AdminTaskManager />
    </MvpGate>
  );
}
