import { AuthFrame } from "@/components/auth/auth-frame";
import { EmailActionForm } from "@/components/auth/auth-forms";

export const metadata = { title: "تحقق من بريدك | شغلني" };

export default function VerificationPendingPage() {
  return (
    <AuthFrame
      title="تحقق من بريدك الإلكتروني"
      description="إذا كان البريد صالحاً، ستصلك رسالة لإكمال التحقق. لا يمكن استخدام الحساب قبل تأكيد البريد. تحقق أيضاً من مجلد الرسائل غير المرغوب فيها."
    >
      <EmailActionForm variant="resend" />
    </AuthFrame>
  );
}
