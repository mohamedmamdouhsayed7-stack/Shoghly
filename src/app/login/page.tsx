import { AuthFrame } from "@/components/auth/auth-frame";
import { SignInForm } from "@/components/auth/auth-forms";
import { safeNextPath } from "@/lib/auth/schemas";

export const metadata = { title: "تسجيل الدخول | شغلني" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; password?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthFrame
      title="مرحباً بعودتك"
      description="سجّل الدخول إلى حسابك في شغلني."
    >
      {params.password === "updated" && (
        <p
          role="status"
          className="bg-primary/5 text-foreground mb-4 rounded-xl px-4 py-3 text-sm"
        >
          تم تحديث كلمة المرور. سجّل الدخول باستخدام كلمة المرور الجديدة.
        </p>
      )}
      <SignInForm nextPath={safeNextPath(params.next ?? null)} />
    </AuthFrame>
  );
}
