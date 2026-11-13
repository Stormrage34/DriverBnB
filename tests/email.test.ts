import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearTestEmailOutbox,
  getTestEmailOutbox,
  passwordResetEmail,
  sendAccountEmail,
  verificationEmail,
} from "@/lib/email";

describe("account email abstraction", () => {
  afterEach(() => {
    clearTestEmailOutbox();
    delete process.env.EMAIL_PROVIDER;
    delete process.env.APP_BASE_URL;
    vi.unstubAllEnvs();
  });

  it("renders a verification link without exposing the token in the subject", () => {
    process.env.APP_BASE_URL = "https://example.test";
    const message = verificationEmail(
      { email: "driver@example.test", displayName: "Driver" },
      "raw-token-value-1234567890",
    );
    expect(message.to).toBe("driver@example.test");
    expect(message.subject).toBe("Confirm your email address");
    expect(message.text).toContain("https://example.test/verify-email?token=raw-token-value-1234567890");
    expect(message.html).toContain("Confirm email");
    expect(message.subject).not.toContain("raw-token-value");
  });

  it("renders a reset link with the one-hour and session-revocation warning", () => {
    process.env.APP_BASE_URL = "https://example.test";
    const message = passwordResetEmail(
      { email: "driver@example.test", displayName: "Driver" },
      "reset-token-value-1234567890",
    );
    expect(message.text).toContain("expires in 1 hour");
    expect(message.text).toContain("signs out every active session");
    expect(message.html).toContain("https://example.test/reset-password?token=reset-token-value-1234567890");
  });

  it("captures messages in the test adapter instead of sending real email", async () => {
    process.env.EMAIL_PROVIDER = "test";
    const result = await sendAccountEmail(
      verificationEmail({ email: "driver@example.test", displayName: "Driver" }, "test-token-value"),
    );
    expect(result).toEqual({ delivered: true, provider: "test" });
    expect(getTestEmailOutbox()).toHaveLength(1);
    expect(getTestEmailOutbox()[0].to).toBe("driver@example.test");
  });

  it("fails safe when no provider is configured", async () => {
    process.env.EMAIL_PROVIDER = "disabled";
    const result = await sendAccountEmail(
      verificationEmail({ email: "driver@example.test", displayName: "Driver" }, "test-token-value"),
    );
    expect(result).toEqual({ delivered: false, provider: "disabled", reason: "disabled" });
    expect(getTestEmailOutbox()).toHaveLength(0);
  });

  it("uses the memory adapter in local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EMAIL_PROVIDER", "test");
    vi.stubEnv("APP_BASE_URL", "http://localhost:3000");
    const result = await sendAccountEmail(
      verificationEmail({ email: "driver@example.test", displayName: "Driver" }, "test-token-value"),
    );
    expect(result).toEqual({ delivered: true, provider: "test" });
    expect(getTestEmailOutbox()).toHaveLength(1);
    vi.unstubAllEnvs();
  });

  it("allows the memory adapter in production only with an explicitly local base URL", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_PROVIDER", "test");
    vi.stubEnv("APP_BASE_URL", "http://127.0.0.1:3211");
    const result = await sendAccountEmail(
      verificationEmail({ email: "driver@example.test", displayName: "Driver" }, "test-token-value"),
    );
    expect(result).toEqual({ delivered: true, provider: "test" });
    expect(getTestEmailOutbox()).toHaveLength(1);
    vi.unstubAllEnvs();
  });

  it("refuses the memory adapter in production when the base URL is not local", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_PROVIDER", "test");
    vi.stubEnv("APP_BASE_URL", "https://milevana.eu");
    const result = await sendAccountEmail(
      verificationEmail({ email: "driver@example.test", displayName: "Driver" }, "test-token-value"),
    );
    expect(result).toEqual({ delivered: false, provider: "disabled", reason: "disabled" });
    expect(getTestEmailOutbox()).toHaveLength(0);
    vi.unstubAllEnvs();
  });

  it("refuses the memory adapter in production when APP_BASE_URL is absent", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_PROVIDER", "test");
    delete process.env.APP_BASE_URL;
    const result = await sendAccountEmail(
      verificationEmail({ email: "driver@example.test", displayName: "Driver" }, "test-token-value"),
    );
    expect(result).toEqual({ delivered: false, provider: "disabled", reason: "disabled" });
    expect(getTestEmailOutbox()).toHaveLength(0);
    vi.unstubAllEnvs();
  });
});
