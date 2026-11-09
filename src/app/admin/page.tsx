import { AdminDashboard } from "@/components/mvp/admin-dashboard";
import { MvpGate } from "@/components/mvp/mvp-gate";

export const dynamic = "force-dynamic";
export const metadata = { title: "لوحة التحكم | شغلني" };

export default function AdminPage() {
  return (
    <MvpGate permission="task.manage.read">
      <AdminDashboard />
    </MvpGate>
  );
}
