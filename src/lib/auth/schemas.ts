import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());

export const passwordSchema = z.string().min(12).max(128);

export const signUpSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const signInSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
  })
  .strict();

export const emailOnlySchema = z.object({ email: emailSchema }).strict();

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1).max(128),
  })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
  });

export const profileUpdateSchema = z
  .object({ displayName: z.string().trim().min(2).max(80) })
  .strict();

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const IDLE_AUTH_ACTION_STATE: AuthActionState = { status: "idle" };

export function safeNextPath(
  value: string | null,
  fallback = "/profile",
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return fallback;
  if (value.includes("\\") || value.includes("\r") || value.includes("\n")) {
    return fallback;
  }
  return value;
}
