import { AuthStatus } from "@/components/auth/auth-status";

export const metadata = { title: "الحساب غير مفعّل | شغلني" };

export default function AccountSuspendedPage() {
  return (
    <AuthStatus
      title="الحساب غير مفعّل"
      description="لا يمكن استخدام هذا الحساب حالياً. تواصل مع فريق الدعم إذا كنت بحاجة إلى مراجعة الحالة."
      actionHref="/"
      actionLabel="العودة إلى الصفحة الرئيسية"
    />
  );
}
