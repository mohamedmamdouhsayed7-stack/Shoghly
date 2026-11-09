import "server-only";

import { isIP } from "node:net";
import { z } from "zod";

const serverEnvSchema = z.object({
  APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
  APP_URL: z.url(),
});

const supabaseEnvSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

export class MissingSupabaseConfigurationError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(`Missing Supabase configuration: ${missing.join(", ")}`);
    this.name = "MissingSupabaseConfigurationError";
    this.missing = missing;
  }
}

export function parseServerEnv(
  values: Record<string, string | undefined>,
): ServerEnv {
  const result = serverEnvSchema.parse(values);
  const url = new URL(result.APP_URL);
  const loopback = isLoopbackHost(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(
        result.APP_ENV === "development" &&
        url.protocol === "http:" &&
        loopback
      ))
  ) {
    throw new Error(
      "APP_URL must be an HTTPS origin, or a loopback HTTP origin in development.",
    );
  }
  return result;
}

export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env);
}

export function parseSupabaseEnv(
  values: Record<string, string | undefined>,
): SupabaseEnv {
  const result = supabaseEnvSchema.safeParse(values);
  if (!result.success) {
    const missing = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"].filter(
      (name) => !values[name]?.trim(),
    );
    throw new MissingSupabaseConfigurationError(
      missing.length > 0
        ? missing
        : result.error.issues.map((issue) => issue.path.join(".")),
    );
  }

  const url = new URL(result.data.SUPABASE_URL);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(url.protocol === "http:" && isLoopbackHost(url.hostname)))
  ) {
    throw new Error(
      "SUPABASE_URL must be HTTPS, or a loopback HTTP URL for local development.",
    );
  }

  return result.data;
}

function isLoopbackHost(hostname: string) {
  const normalizedHostname = hostname.replace(/^\[|\]$/g, "");
  return (
    normalizedHostname === "localhost" ||
    normalizedHostname === "::1" ||
    (isIP(normalizedHostname) === 4 && normalizedHostname.startsWith("127."))
  );
}

export function getSupabaseEnv(): SupabaseEnv {
  return parseSupabaseEnv(process.env);
}

export function isSupabaseConfigured(): boolean {
  try {
    getSupabaseEnv();
    return true;
  } catch {
    return false;
  }
}
