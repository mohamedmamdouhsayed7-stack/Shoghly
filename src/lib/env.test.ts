import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env";

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
  });
});
