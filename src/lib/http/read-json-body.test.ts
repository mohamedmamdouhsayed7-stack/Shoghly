import { describe, expect, it } from "vitest";
import {
  readJsonBody,
  RequestBodyTooLargeError,
} from "@/lib/http/read-json-body";

describe("bounded JSON request bodies", () => {
  it("parses a small JSON body", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roleKey: "task_reviewer" }),
    });

    await expect(readJsonBody(request)).resolves.toEqual({
      roleKey: "task_reviewer",
    });
  });

  it("rejects a body that exceeds the streaming byte limit", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      body: "x".repeat(33),
    });

    await expect(readJsonBody(request, 32)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });

  it("rejects malformed JSON", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      body: "{invalid",
    });

    await expect(readJsonBody(request)).rejects.toBeInstanceOf(SyntaxError);
  });
});
