import { AuthStatus, ConfigurationStatus } from "@/components/auth/auth-status";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignOutForm } from "@/components/auth/sign-out-form";
import { getAccountAccess } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "تم التحقق | شغلني" };

export default async function VerifiedPage() {
  const access = await getAccountAccess();
  if (access.kind === "unconfigured") return <ConfigurationStatus />;
  if (access.kind === "suspended" || access.kind === "disabled") {
    return (
      <AuthStatus
        title="الحساب غير مفعّل"
        description="تم التحقق من البريد، لكن الحساب غير مفعّل حالياً. تواصل مع الدعم للمساعدة."
      />
    );
  }
  if (access.kind !== "active") {
    return (
      <AuthStatus
        title="تعذّر تأكيد الحساب"
        description="لم نتمكن من تأكيد جلسة الحساب. استخدم رابط التحقق الأحدث أو اطلب رسالة جديدة."
        actionHref="/auth/verification-pending"
        actionLabel="طلب رسالة تحقق جديدة"
      />
    );
  }

  return (
    <AuthFrame
      title="تم التحقق من بريدك"
      description="أصبح حسابك جاهزاً. يمكنك المتابعة إلى ملفك الشخصي."
    >
      <div className="flex flex-col gap-3">
        <a
          href="/profile"
          className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
        >
          الانتقال إلى الملف الشخصي
        </a>
        <SignOutForm />
      </div>
    </AuthFrame>
  );
}
