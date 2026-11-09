import { AuthFrame } from "@/components/auth/auth-frame";
import { SignUpForm } from "@/components/auth/auth-forms";

export const metadata = { title: "إنشاء حساب | شغلني" };

export default function RegisterPage() {
  return (
    <AuthFrame
      title="أنشئ حسابك"
      description="أدخل بياناتك، ثم أكّد بريدك الإلكتروني لتفعيل الحساب."
    >
      <SignUpForm />
    </AuthFrame>
  );
}
