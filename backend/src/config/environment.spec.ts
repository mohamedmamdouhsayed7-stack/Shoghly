import { parseEnvironment } from "./environment";

const developmentEnvironment = {
  APP_ENV: "development",
  PORT: "4000",
  FRONTEND_ORIGIN: "http://127.0.0.1:3000",
  DATABASE_URL:
    "postgresql://shoghly:local-only@127.0.0.1:55432/shoghly_backend_disposable?schema=public",
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_PUBLISHABLE_KEY: "local-example-key",
  REWARD_MULTIPLIER_SNAPSHOT_POLICY: "submission",
};

describe("backend environment safety", () => {
  it("requires an explicit multiplier snapshot decision", () => {
    expect(() =>
      parseEnvironment({
        ...developmentEnvironment,
        REWARD_MULTIPLIER_SNAPSHOT_POLICY: undefined,
      }),
    ).toThrow(/REWARD_MULTIPLIER_SNAPSHOT_POLICY/);
  });

  it("rejects non-HTTPS remote database and Auth endpoints", () => {
    expect(() =>
      parseEnvironment({
        ...developmentEnvironment,
        APP_ENV: "production",
        DATABASE_URL:
          "postgresql://app:secret@db.example.com/shoghly?sslmode=require",
        SUPABASE_URL: "http://auth.example.com",
      }),
    ).toThrow(/SUPABASE_URL/);
    expect(() =>
      parseEnvironment({
        ...developmentEnvironment,
        APP_ENV: "production",
        SUPABASE_URL: "https://auth.example.com",
        DATABASE_URL:
          "postgresql://app:secret@db.example.com/shoghly?schema=public",
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("accepts only exact local development origins without paths or credentials", () => {
    expect(parseEnvironment(developmentEnvironment).PORT).toBe(4000);
    expect(() =>
      parseEnvironment({
        ...developmentEnvironment,
        FRONTEND_ORIGIN: "http://127.0.0.1:3000/untrusted-path",
      }),
    ).toThrow(/FRONTEND_ORIGIN/);
  });
});
