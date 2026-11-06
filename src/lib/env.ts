import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
  APP_URL: z.url(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(
  values: Record<string, string | undefined>,
): ServerEnv {
  return serverEnvSchema.parse(values);
}

export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env);
}
