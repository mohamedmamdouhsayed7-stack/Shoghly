import { MvpGate } from "@/components/mvp/mvp-gate";
import { TaskMarketplace } from "@/components/mvp/tasks";

export const dynamic = "force-dynamic";
export const metadata = { title: "المهام المتاحة | شغلني" };

export default function TasksPage() {
  return (
    <MvpGate>
      <TaskMarketplace />
    </MvpGate>
  );
}
