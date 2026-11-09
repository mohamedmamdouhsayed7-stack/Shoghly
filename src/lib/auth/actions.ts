"use server";

import { redirect } from "next/navigation";
import { getServerEnv, MissingSupabaseConfigurationError } from "@/lib/env";
import { AUTH_MESSAGES } from "@/lib/auth/messages";
import {
  emailOnlySchema,
  IDLE_AUTH_ACTION_STATE,
  profileUpdateSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  safeNextPath,
  type AuthActionState,
} from "@/lib/auth/schemas";
import { getAccountAccess } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function readForm(formData: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, formData.get(key)]));
}

function isMissingConfiguration(error: unknown) {
  return error instanceof MissingSupabaseConfigurationError;
}

function authRedirect(path: string): string | null {
  try {
    return new URL(path, getServerEnv().APP_URL).toString();
  } catch {
    return null;
  }
}

function invalidForm(): AuthActionState {
  return {
    status: "error",
    message: "تحقق من الحقول المدخلة وحاول مرة أخرى.",
  };
}

export async function signUpAction(
  _previous: AuthActionState = IDLE_AUTH_ACTION_STATE,
  formData: FormData,
): Promise<AuthActionState> {
  void _previous;
  const parsed = signUpSchema.safeParse(
    readForm(formData, ["displayName", "email", "password"]),
  );
  if (!parsed.success) return invalidForm();
  const emailRedirectTo = authRedirect("/auth/callback?next=/auth/verified");
  if (!emailRedirectTo) {
    return { status: "error", message: AUTH_MESSAGES.configuration };
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    if (isMissingConfiguration(error)) {
      return { status: "error", message: AUTH_MESSAGES.configuration };
    }
    return { status: "error", message: AUTH_MESSAGES.unavailable };
  }

  let data;
  let error;
  try {
    ({ data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo,
        data: { display_name: parsed.data.displayName },
      },
    }));
  } catch {
    return { status: "error", message: AUTH_MESSAGES.unavailable };
  }

  if (error) return { status: "error", message: AUTH_MESSAGES.unavailable };
  if (data.session) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Reject the flow even if cleanup cannot reach the Auth service.
    }
    return {
      status: "error",
      message:
        "تأكيد البريد الإلكتروني غير مفعّل في إعدادات الخدمة. لا يمكن استخدام الحساب قبل تفعيله.",
    };
  }

  // Keep the response identical for existing and new addresses.
  redirect("/auth/verification-pending");
}

export async function signInAction(
  _previous: AuthActionState = IDLE_AUTH_ACTION_STATE,
  formData: FormData,
): Promise<AuthActionState> {
  void _previous;
  const parsed = signInSchema.safeParse(
    readForm(formData, ["email", "password"]),
  );
  if (!parsed.success) return invalidForm();

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    if (isMissingConfiguration(error)) {
      return { status: "error", message: AUTH_MESSAGES.configuration };
    }
    return { status: "error", message: AUTH_MESSAGES.unavailable };
  }

  let error;
  try {
    ({ error } = await supabase.auth.signInWithPassword(parsed.data));
  } catch {
    return { status: "error", message: AUTH_MESSAGES.unavailable };
  }
  if (error) {
    return { status: "error", message: AUTH_MESSAGES.invalidCredentials };
  }

  const access = await getAccountAccess();
  if (access.kind === "unverified") {
    await supabase.auth.signOut();
    return { status: "error", message: AUTH_MESSAGES.verificationRequired };
  }
  if (access.kind === "suspended" || access.kind === "disabled") {
    await supabase.auth.signOut();
    redirect("/account/suspended");
  }
  if (access.kind !== "active") {
    await supabase.auth.signOut();
    return {
      status: "error",
      message:
        access.kind === "unconfigured"
          ? AUTH_MESSAGES.configuration
          : AUTH_MESSAGES.unavailable,
    };
  }

  const requestedPath = formData.get("next");
  redirect(
    safeNextPath(typeof requestedPath === "string" ? requestedPath : null),
  );
}

export async function resendVerificationAction(
  _previous: AuthActionState = IDLE_AUTH_ACTION_STATE,
  formData: FormData,
): Promise<AuthActionState> {
  void _previous;
  const parsed = emailOnlySchema.safeParse(readForm(formData, ["email"]));
  if (!parsed.success) return invalidForm();
  const emailRedirectTo = authRedirect("/auth/callback?next=/auth/verified");
  if (!emailRedirectTo) {
    return { status: "error", message: AUTH_MESSAGES.configuration };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: parsed.data.email,
      options: {
        emailRedirectTo,
      },
    });
    if (error) {
      return { status: "error", message: AUTH_MESSAGES.unavailable };
    }
  } catch (error) {
    if (isMissingConfiguration(error)) {
      return { status: "error", message: AUTH_MESSAGES.configuration };
    }
    return { status: "error", message: AUTH_MESSAGES.unavailable };
  }

  return { status: "success", message: AUTH_MESSAGES.verificationSent };
}

export async function requestPasswordResetAction(
  _previous: AuthActionState = IDLE_AUTH_ACTION_STATE,
  formData: FormData,
): Promise<AuthActionState> {
  void _previous;
  const parsed = emailOnlySchema.safeParse(readForm(formData, ["email"]));
  if (!parsed.success) return invalidForm();
  const redirectTo = authRedirect("/auth/callback?next=/reset-password");
  if (!redirectTo) {
    return { status: "error", message: AUTH_MESSAGES.configuration };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      {
        redirectTo,
      },
    );
    if (error) {
      return { status: "error", message: AUTH_MESSAGES.unavailable };
    }
  } catch (error) {
    if (isMissingConfiguration(error)) {
      return { status: "error", message: AUTH_MESSAGES.configuration };
    }
    return { status: "error", message: AUTH_MESSAGES.unavailable };
  }

  return { status: "success", message: AUTH_MESSAGES.passwordResetSent };
}

export async function resetPasswordAction(
  _previous: AuthActionState = IDLE_AUTH_ACTION_STATE,
  formData: FormData,
): Promise<AuthActionState> {
  void _previous;
  const parsed = resetPasswordSchema.safeParse(
    readForm(formData, ["password", "confirmPassword"]),
  );
  if (!parsed.success) return invalidForm();

  const access = await getAccountAccess();
  if (access.kind !== "active") {
    const message =
      access.kind === "unconfigured"
        ? AUTH_MESSAGES.configuration
        : access.kind === "unverified"
          ? AUTH_MESSAGES.verificationRequired
          : AUTH_MESSAGES.passwordResetFailed;
    return { status: "error", message };
  }

  try {
    const { error } = await access.supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) {
      return { status: "error", message: AUTH_MESSAGES.passwordResetFailed };
    }
  } catch {
    return { status: "error", message: AUTH_MESSAGES.passwordResetFailed };
  }

  try {
    await access.supabase.auth.signOut();
  } catch {
    // The password has changed; continue to the login screen.
  }
  redirect("/login?password=updated");
}

export async function signOutAction() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // The local client still leaves the protected page after configuration errors.
  }
  redirect("/login");
}

export async function updateProfileAction(
  _previous: AuthActionState = IDLE_AUTH_ACTION_STATE,
  formData: FormData,
): Promise<AuthActionState> {
  void _previous;
  const parsed = profileUpdateSchema.safeParse(
    readForm(formData, ["displayName"]),
  );
  if (!parsed.success) return invalidForm();

  const access = await getAccountAccess();
  if (access.kind !== "active") {
    return {
      status: "error",
      message:
        access.kind === "unconfigured"
          ? AUTH_MESSAGES.configuration
          : access.kind === "suspended" || access.kind === "disabled"
            ? "الحساب غير مفعّل. تواصل مع الدعم للمساعدة."
            : AUTH_MESSAGES.unavailable,
    };
  }

  try {
    const { error } = await access.supabase
      .from("profiles")
      .update({ display_name: parsed.data.displayName })
      .eq("user_id", access.user.id);
    if (error) return { status: "error", message: AUTH_MESSAGES.profileFailed };
  } catch {
    return { status: "error", message: AUTH_MESSAGES.profileFailed };
  }

  return { status: "success", message: AUTH_MESSAGES.profileSaved };
}
