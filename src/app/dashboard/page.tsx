import { WorkerDashboard } from "@/components/mvp/dashboard";
import { MvpGate } from "@/components/mvp/mvp-gate";

export const dynamic = "force-dynamic";
export const metadata = { title: "لوحة العامل | شغلني" };

export default function DashboardPage() {
  return (
    <MvpGate showAdminLink>
      <WorkerDashboard />
    </MvpGate>
  );
}
