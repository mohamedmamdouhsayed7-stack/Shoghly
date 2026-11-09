import { AuthFrame } from "@/components/auth/auth-frame";
import { EmailActionForm } from "@/components/auth/auth-forms";

export const metadata = { title: "استعادة كلمة المرور | شغلني" };

export default function ForgotPasswordPage() {
  return (
    <AuthFrame
      title="استعادة كلمة المرور"
      description="أدخل بريدك الإلكتروني، وسنرسل تعليمات الاستعادة إذا كان مرتبطاً بحساب."
    >
      <EmailActionForm variant="reset-request" />
    </AuthFrame>
  );
}
