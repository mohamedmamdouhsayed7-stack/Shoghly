import { MvpGate } from "@/components/mvp/mvp-gate";
import { MySubmissions } from "@/components/mvp/user-submissions";

export const dynamic = "force-dynamic";
export const metadata = { title: "مشاركاتي | شغلني" };

export default function SubmissionsPage() {
  return (
    <MvpGate>
      <MySubmissions />
    </MvpGate>
  );
}
