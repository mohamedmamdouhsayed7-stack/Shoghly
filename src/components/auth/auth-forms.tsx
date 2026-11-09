"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  IDLE_AUTH_ACTION_STATE,
  type AuthActionState,
} from "@/lib/auth/schemas";
import {
  requestPasswordResetAction,
  resendVerificationAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
  updateProfileAction,
} from "@/lib/auth/actions";

function ActionNotice({ state }: { state: AuthActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      aria-live={state.status === "error" ? "assertive" : "polite"}
      className={`mb-4 rounded-xl border px-4 py-3 text-sm leading-6 ${state.status === "error" ? "border-red-300 bg-red-50 text-red-900" : "border-primary/25 bg-primary/5 text-foreground"}`}
    >
      {state.message}
    </p>
  );
}

function Field({
  id,
  label,
  type = "text",
  autoComplete,
  minLength,
  maxLength,
  required = true,
  dir,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        dir={dir}
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={maxLength}
        required={required}
        className="border-border bg-background text-foreground focus-visible:border-primary focus-visible:ring-primary/25 min-h-12 w-full rounded-xl border px-4 text-sm transition outline-none focus-visible:ring-2"
      />
    </div>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(
    signUpAction,
    IDLE_AUTH_ACTION_STATE,
  );
  return (
    <form action={action} className="space-y-5">
      <ActionNotice state={state} />
      <Field
        id="displayName"
        label="الاسم الظاهر"
        autoComplete="name"
        maxLength={80}
      />
      <Field
        id="email"
        label="البريد الإلكتروني"
        type="email"
        autoComplete="email"
        dir="ltr"
        maxLength={254}
      />
      <Field
        id="password"
        label="كلمة المرور"
        type="password"
        autoComplete="new-password"
        dir="ltr"
        minLength={12}
        maxLength={128}
      />
      <p className="text-muted-foreground -mt-3 text-xs leading-5">
        استخدم 12 حرفاً على الأقل.
      </p>
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "جارٍ إنشاء الطلب…" : "إنشاء حساب"}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        لديك حساب؟{" "}
        <Link
          className="text-primary font-semibold underline-offset-4 hover:underline"
          href="/login"
        >
          سجّل الدخول
        </Link>
      </p>
    </form>
  );
}

export function SignInForm({ nextPath = "/profile" }: { nextPath?: string }) {
  const [state, action, pending] = useActionState(
    signInAction,
    IDLE_AUTH_ACTION_STATE,
  );
  return (
    <form action={action} className="space-y-5">
      <ActionNotice state={state} />
      <input type="hidden" name="next" value={nextPath} />
      <Field
        id="email"
        label="البريد الإلكتروني"
        type="email"
        autoComplete="email"
        dir="ltr"
        maxLength={254}
      />
      <Field
        id="password"
        label="كلمة المرور"
        type="password"
        autoComplete="current-password"
        dir="ltr"
        maxLength={128}
      />
      <div className="-mt-2 text-start">
        <Link
          className="text-primary text-sm font-semibold underline-offset-4 hover:underline"
          href="/forgot-password"
        >
          نسيت كلمة المرور؟
        </Link>
        <Link
          className="text-primary mt-2 block text-sm font-semibold underline-offset-4 hover:underline"
          href="/auth/verification-pending"
        >
          لم تصلك رسالة التحقق؟
        </Link>
      </div>
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول"}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        مستخدم جديد؟{" "}
        <Link
          className="text-primary font-semibold underline-offset-4 hover:underline"
          href="/register"
        >
          أنشئ حساباً
        </Link>
      </p>
    </form>
  );
}

export function EmailActionForm({
  variant,
}: {
  variant: "resend" | "reset-request";
}) {
  const actionToUse =
    variant === "resend"
      ? resendVerificationAction
      : requestPasswordResetAction;
  const [state, action, pending] = useActionState(
    actionToUse,
    IDLE_AUTH_ACTION_STATE,
  );
  return (
    <form action={action} className="space-y-5">
      <ActionNotice state={state} />
      <Field
        id="email"
        label="البريد الإلكتروني"
        type="email"
        autoComplete="email"
        dir="ltr"
        maxLength={254}
      />
      <Button className="w-full" type="submit" disabled={pending}>
        {pending
          ? "جارٍ الإرسال…"
          : variant === "resend"
            ? "إرسال رسالة التحقق"
            : "إرسال تعليمات الاستعادة"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(
    resetPasswordAction,
    IDLE_AUTH_ACTION_STATE,
  );
  return (
    <form action={action} className="space-y-5">
      <ActionNotice state={state} />
      <Field
        id="password"
        label="كلمة المرور الجديدة"
        type="password"
        autoComplete="new-password"
        dir="ltr"
        minLength={12}
        maxLength={128}
      />
      <Field
        id="confirmPassword"
        label="تأكيد كلمة المرور"
        type="password"
        autoComplete="new-password"
        dir="ltr"
        minLength={12}
        maxLength={128}
      />
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "جارٍ التحديث…" : "تحديث كلمة المرور"}
      </Button>
    </form>
  );
}

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState(
    updateProfileAction,
    IDLE_AUTH_ACTION_STATE,
  );
  return (
    <form action={action} className="max-w-lg space-y-5">
      <ActionNotice state={state} />
      <div className="space-y-2">
        <label htmlFor="displayName" className="block text-sm font-semibold">
          الاسم الظاهر
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={displayName}
          minLength={2}
          maxLength={80}
          required
          className="border-border bg-background focus-visible:border-primary focus-visible:ring-primary/25 min-h-12 w-full rounded-xl border px-4 text-sm transition outline-none focus-visible:ring-2"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : "حفظ التغييرات"}
      </Button>
    </form>
  );
}
