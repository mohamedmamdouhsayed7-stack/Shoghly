import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth/auth-frame";
import { AuthStatus, ConfigurationStatus } from "@/components/auth/auth-status";
import { ProfileForm } from "@/components/auth/auth-forms";
import { SignOutForm } from "@/components/auth/sign-out-form";
import { getAccountAccess } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "الملف الشخصي | شغلني" };

export default async function ProfilePage() {
  const access = await getAccountAccess();
  if (access.kind === "unconfigured") return <ConfigurationStatus />;
  if (access.kind === "anonymous") redirect("/login?next=/profile");
  if (access.kind === "unverified") redirect("/auth/verification-pending");
  if (access.kind === "suspended" || access.kind === "disabled") {
    return (
      <AuthStatus
        title="الحساب غير مفعّل"
        description="لا يمكن عرض الملف الشخصي لهذا الحساب حالياً. تواصل مع الدعم للمساعدة."
        actionHref="/account/suspended"
        actionLabel="معلومات عن حالة الحساب"
      />
    );
  }
  if (access.kind !== "active") {
    return (
      <AuthStatus
        title="تعذّر تحميل الملف الشخصي"
        description="تعذّر التحقق من حالة الحساب. تأكد من إعداد قاعدة البيانات ثم حاول مرة أخرى."
      />
    );
  }

  const { data: profile, error } = await access.supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", access.user.id)
    .maybeSingle();

  if (error || !profile) {
    return (
      <AuthStatus
        title="الملف الشخصي غير جاهز"
        description="تعذّر قراءة الملف الشخصي. تأكد من تطبيق ترحيلات Phase 2 على بيئة التطوير."
      />
    );
  }

  return (
    <AuthFrame
      title="الملف الشخصي"
      description="يمكنك تعديل الاسم الظاهر. البريد الإلكتروني وحالة الحساب يديرهما نظام المصادقة والإدارة."
    >
      <div className="bg-secondary/70 mb-6 rounded-xl p-4 text-sm">
        <p className="font-semibold">البريد الإلكتروني</p>
        <p dir="ltr" className="text-muted-foreground mt-1 text-start">
          {access.user.email}
        </p>
        <p className="mt-3 font-semibold">حالة التحقق</p>
        <p className="text-muted-foreground mt-1">تم التحقق من البريد</p>
      </div>
      <ProfileForm displayName={profile.display_name} />
      <div className="border-border mt-6 border-t pt-5">
        <SignOutForm />
      </div>
    </AuthFrame>
  );
}
