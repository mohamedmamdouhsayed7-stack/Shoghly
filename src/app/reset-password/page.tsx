import { AuthFrame } from "@/components/auth/auth-frame";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

export const metadata = { title: "تعيين كلمة مرور جديدة | شغلني" };

export default function ResetPasswordPage() {
  return (
    <AuthFrame
      title="اختر كلمة مرور جديدة"
      description="استخدم 12 حرفاً على الأقل. يجب فتح هذه الصفحة من رابط استعادة صالح."
    >
      <ResetPasswordForm />
    </AuthFrame>
  );
}
