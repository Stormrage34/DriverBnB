import { afterEach, describe, expect, it, vi } from "vitest";

const headerState = vi.hoisted(() => ({ current: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => headerState.current,
  cookies: async () => ({
    get: () => undefined,
    set: () => undefined,
    delete: () => undefined,
  }),
}));

import { requestContext } from "@/lib/auth";

describe("trusted proxy handling", () => {
  afterEach(() => {
    delete process.env.TRUST_PROXY;
    headerState.current = new Headers();
  });

  it("ignores a spoofed X-Forwarded-For unless TRUST_PROXY is enabled", async () => {
    headerState.current = new Headers({
      "x-forwarded-for": "203.0.113.9, 10.0.0.1",
      "x-real-ip": "203.0.113.9",
      "user-agent": "test-agent",
    });
    expect((await requestContext()).ip).toBe("local");
  });

  it("takes the first forwarded address only behind a trusted proxy", async () => {
    process.env.TRUST_PROXY = "true";
    headerState.current = new Headers({
      "x-forwarded-for": "203.0.113.9, 10.0.0.1",
      "user-agent": "test-agent",
    });
    expect(await requestContext()).toEqual({ ip: "203.0.113.9", userAgent: "test-agent" });
  });

  it("does not treat TRUST_PROXY=false as trusted", async () => {
    process.env.TRUST_PROXY = "false";
    headerState.current = new Headers({ "x-forwarded-for": "203.0.113.9" });
    expect((await requestContext()).ip).toBe("local");
  });
});
