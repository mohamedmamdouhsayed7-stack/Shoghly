import { describe, expect, it } from "vitest";
import {
  MissingSupabaseConfigurationError,
  parseServerEnv,
  parseSupabaseEnv,
} from "@/lib/env";

describe("server environment validation", () => {
  it("accepts safe application configuration", () => {
    expect(
      parseServerEnv({
        APP_ENV: "development",
        APP_URL: "http://localhost:3000",
      }),
    ).toEqual({
      APP_ENV: "development",
      APP_URL: "http://localhost:3000",
    });
  });

  it("rejects an invalid deployment environment or URL", () => {
    expect(() =>
      parseServerEnv({ APP_ENV: "production", APP_URL: "not-a-url" }),
    ).toThrow();
    expect(() =>
      parseServerEnv({ APP_ENV: "preview", APP_URL: "https://example.com" }),
    ).toThrow();
    expect(() =>
      parseServerEnv({
        APP_ENV: "production",
        APP_URL: "http://localhost:3000",
      }),
    ).toThrow(/HTTPS/);
    expect(() =>
      parseServerEnv({ APP_ENV: "development", APP_URL: "http://example.com" }),
    ).toThrow(/loopback/);
  });

  it("accepts local Supabase configuration without exposing a secret key", () => {
    expect(
      parseSupabaseEnv({
        SUPABASE_URL: "http://127.0.0.1:54321",
        SUPABASE_PUBLISHABLE_KEY: "local-publishable-key",
      }),
    ).toEqual({
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_PUBLISHABLE_KEY: "local-publishable-key",
    });
  });

  it("reports exact missing Supabase configuration names", () => {
    expect(() => parseSupabaseEnv({})).toThrowError(
      new MissingSupabaseConfigurationError([
        "SUPABASE_URL",
        "SUPABASE_PUBLISHABLE_KEY",
      ]),
    );
  });

  it("rejects insecure non-local Supabase URLs", () => {
    expect(() =>
      parseSupabaseEnv({
        SUPABASE_URL: "http://supabase.example.com",
        SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      }),
    ).toThrow(/HTTPS/);
    expect(() =>
      parseSupabaseEnv({
        SUPABASE_URL: "ftp://localhost:54321",
        SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      }),
    ).toThrow(/HTTPS/);
    expect(() =>
      parseSupabaseEnv({
        SUPABASE_URL: "http://127.evil.example",
        SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      }),
    ).toThrow(/HTTPS/);
  });

  it("accepts IPv6 loopback for local Supabase", () => {
    expect(
      parseSupabaseEnv({
        SUPABASE_URL: "http://[::1]:54321",
        SUPABASE_PUBLISHABLE_KEY: "local-publishable-key",
      }).SUPABASE_URL,
    ).toBe("http://[::1]:54321");
  });
});
