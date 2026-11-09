import { describe, expect, it } from "vitest";
import { hasSameOrigin } from "@/lib/http/same-origin";

describe("same-origin mutation request validation", () => {
  it("accepts only the configured application origin", () => {
    const request = new Request("https://app.example/api/admin", {
      headers: { origin: "https://app.example" },
    });
    expect(hasSameOrigin(request, "https://app.example")).toBe(true);
  });

  it("rejects cross-origin, missing, and malformed origins", () => {
    for (const origin of ["https://attacker.example", "null", null]) {
      const headers = new Headers({ host: "app.example" });
      if (origin) headers.set("origin", origin);
      const request = new Request("https://app.example/api/admin", {
        headers,
      });
      expect(hasSameOrigin(request, "https://app.example")).toBe(false);
    }
  });

  it("does not trust forwarded host headers to override the app origin", () => {
    const request = new Request("http://internal/api/admin", {
      headers: {
        origin: "https://attacker.example",
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "https",
      },
    });
    expect(hasSameOrigin(request, "https://app.example")).toBe(false);
  });
});
