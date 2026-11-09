import { z } from "zod";

const environmentSchema = z.object({
  APP_ENV: z.enum(["development", "test", "staging", "production"]),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  FRONTEND_ORIGIN: z.url(),
  DATABASE_URL: z.url().refine((value) => value.startsWith("postgresql://")),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
  REWARD_MULTIPLIER_SNAPSHOT_POLICY: z.enum(["submission", "approval"]),
});

export type BackendEnvironment = z.infer<typeof environmentSchema>;

export function parseEnvironment(
  values: Record<string, string | undefined>,
): BackendEnvironment {
  const parsed = environmentSchema.safeParse(values);
  if (!parsed.success) {
    const keys = [
      ...new Set(parsed.error.issues.map((issue) => issue.path.join("."))),
    ];
    throw new Error(
      `Backend environment is incomplete or invalid: ${keys.join(", ")}`,
    );
  }
  const databaseUrl = new URL(parsed.data.DATABASE_URL);
  const supabaseUrl = new URL(parsed.data.SUPABASE_URL);
  const databaseHost = databaseUrl.hostname.replace(/^\[|\]$/g, "");
  const localDatabase = ["127.0.0.1", "localhost", "::1"].includes(
    databaseHost,
  );
  if (databaseUrl.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol.");
  }
  if (localDatabase && !["development", "test"].includes(parsed.data.APP_ENV)) {
    throw new Error(
      "DATABASE_URL loopback hosts are allowed only in development or test.",
    );
  }
  if (
    !localDatabase &&
    !["require", "verify-ca", "verify-full"].includes(
      databaseUrl.searchParams.get("sslmode") ?? "",
    )
  ) {
    throw new Error(
      "DATABASE_URL must require TLS outside loopback development.",
    );
  }
  const localAuth = ["127.0.0.1", "localhost", "::1"].includes(
    supabaseUrl.hostname.replace(/^\[|\]$/g, ""),
  );
  if (
    supabaseUrl.protocol !== "https:" &&
    !(
      parsed.data.APP_ENV === "development" &&
      supabaseUrl.protocol === "http:" &&
      localAuth
    )
  ) {
    throw new Error(
      "SUPABASE_URL must use HTTPS, except loopback development URLs.",
    );
  }
  if (databaseUrl.username.length === 0 || databaseUrl.password.length === 0) {
    throw new Error(
      "DATABASE_URL must include credentials in server configuration.",
    );
  }
  if (
    databaseUrl.searchParams.get("sslmode") === "disable" &&
    parsed.data.APP_ENV !== "development"
  ) {
    throw new Error("DATABASE_URL must not disable TLS outside development.");
  }
  const frontendOrigin = new URL(parsed.data.FRONTEND_ORIGIN);
  if (
    frontendOrigin.username ||
    frontendOrigin.password ||
    frontendOrigin.pathname !== "/"
  ) {
    throw new Error(
      "FRONTEND_ORIGIN must be an origin without credentials or a path.",
    );
  }
  return parsed.data;
}
