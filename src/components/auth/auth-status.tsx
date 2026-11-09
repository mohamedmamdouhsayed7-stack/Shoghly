import Link from "next/link";
import { AuthFrame } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";

export function AuthStatus({
  title,
  description,
  actionHref = "/login",
  actionLabel = "العودة إلى تسجيل الدخول",
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <AuthFrame title={title} description={description}>
      <Button asChild className="w-full">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </AuthFrame>
  );
}

export function ConfigurationStatus() {
  return (
    <AuthStatus
      title="إعداد الحسابات مطلوب"
      description="لم يتم إعداد خدمة الحسابات بعد. يلزم تهيئة رابط مشروع Supabase ومفتاح النشر في بيئة التطوير قبل استخدام هذه الصفحة."
      actionHref="/"
      actionLabel="العودة إلى الصفحة الرئيسية"
    />
  );
}
