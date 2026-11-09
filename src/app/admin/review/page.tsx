import { MvpGate } from "@/components/mvp/mvp-gate";
import { ReviewQueue } from "@/components/mvp/tasks";

export const dynamic = "force-dynamic";
export const metadata = { title: "مراجعة المشاركات | شغلني" };

export default function AdminReviewPage() {
  return (
    <MvpGate
      permissions={[
        "task.review.read",
        "task.review.approve",
        "task.review.reject",
      ]}
    >
      <ReviewQueue />
    </MvpGate>
  );
}
