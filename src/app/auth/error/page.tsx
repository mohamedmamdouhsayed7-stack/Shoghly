import { AuthStatus } from "@/components/auth/auth-status";

export const metadata = { title: "تعذّر إكمال الطلب | شغلني" };

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; flow?: string }>;
}) {
  const { state, flow } = await searchParams;
  const expired = state === "expired";
  const recovery = flow === "recovery";
  return (
    <AuthStatus
      title={
        expired
          ? recovery
            ? "رابط الاستعادة انتهت صلاحيته"
            : "رابط التحقق انتهت صلاحيته"
          : "تعذّر إكمال الطلب"
      }
      description={
        expired
          ? recovery
            ? "الرابط غير صالح أو انتهت صلاحيته. اطلب تعليمات استعادة جديدة ثم افتح أحدث رسالة وصلتك."
            : "الرابط غير صالح أو انتهت صلاحيته. اطلب رسالة تحقق جديدة ثم افتح أحدث رسالة وصلتك."
          : "تعذّر تأكيد الطلب. حاول مرة أخرى لاحقاً."
      }
      actionHref={
        expired
          ? recovery
            ? "/forgot-password"
            : "/auth/verification-pending"
          : "/login"
      }
      actionLabel={
        expired
          ? recovery
            ? "طلب تعليمات استعادة جديدة"
            : "طلب رسالة تحقق جديدة"
          : "العودة لتسجيل الدخول"
      }
    />
  );
}
