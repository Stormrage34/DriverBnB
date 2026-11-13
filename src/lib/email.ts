import type { User } from "@/db/schema";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type EmailDeliveryResult =
  | { delivered: true; provider: string }
  | { delivered: false; provider: string; reason: "disabled" | "delivery_failed" };

export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<void>;
}

const testOutbox: EmailMessage[] = [];

/** Test-only outbox. Never called by application code or admin surfaces. */
export const testEmailProvider: EmailProvider = {
  name: "test",
  async send(message) {
    testOutbox.push(message);
  },
};

export function getTestEmailOutbox(): readonly EmailMessage[] {
  return testOutbox;
}

export function clearTestEmailOutbox(): void {
  testOutbox.length = 0;
}

const disabledEmailProvider: EmailProvider = {
  name: "disabled",
  async send() {
    throw new Error("EMAIL_DELIVERY_DISABLED");
  },
};

/**
 * Provider selection is deliberately explicit. There is no production adapter
 * until a provider, DPA and processing location have been chosen.
 */
export function getEmailProvider(): EmailProvider {
  const configured = (process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
  if (configured === "disabled") return disabledEmailProvider;
  if (configured === "test") {
    // The memory adapter is safe for tests and local harnesses only. Refuse it
    // in production unless the application explicitly points at a local base URL.
    if (process.env.NODE_ENV !== "production") return testEmailProvider;
    if (!process.env.APP_BASE_URL?.trim()) return disabledEmailProvider;
    return isLocalBaseUrl() ? testEmailProvider : disabledEmailProvider;
  }
  if (process.env.NODE_ENV === "test") return testEmailProvider;
  return disabledEmailProvider;
}

function isLocalBaseUrl(): boolean {
  try {
    const host = new URL(appBaseUrl()).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

export function appBaseUrl(): string {
  return (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function layout(title: string, paragraphs: string[], action: { label: string; url: string }): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px">${escapeHtml(p)}</p>`).join("");
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f6f5f1;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0a1a2a">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e5e1;border-radius:12px;padding:28px">
      <p style="margin:0 0 24px;font-size:13px;letter-spacing:0.02em;color:#0a1a2a">
        <span style="display:inline-block;width:10px;height:10px;background:#e8a33d;border-radius:2px;margin-right:8px"></span>
        <strong>DriverCompass</strong>
      </p>
      <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3">${escapeHtml(title)}</h1>
      ${body}
      <p style="margin:24px 0">
        <a href="${escapeHtml(action.url)}" style="display:inline-block;background:#0a1a2a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600">${escapeHtml(action.label)}</a>
      </p>
      <p style="margin:0;font-size:12px;color:#61707f">If the button does not work, copy this address into your browser:<br>${escapeHtml(action.url)}</p>
      <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e2e5e1;font-size:12px;color:#61707f">
        DriverCompass — know the employer, choose your next move.
      </p>
    </div>
  </body>
</html>`;
}

export function verificationEmail(user: Pick<User, "email" | "displayName">, token: string): EmailMessage {
  const url = `${appBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  return {
    to: user.email,
    subject: "Confirm your email address",
    text: `Hello ${user.displayName},\n\nConfirm your email address to unlock enquiries, reviews and vacancy publishing. This link expires in 24 hours.\n\n${url}\n\nIf you did not create this account, ignore this email.`,
    html: layout(
      "Confirm your email address",
      [
        `Hello ${user.displayName},`,
        "Confirm your email address to unlock enquiries, reviews and vacancy publishing. This link expires in 24 hours.",
        "If you did not create this account, ignore this email.",
      ],
      { label: "Confirm email", url },
    ),
  };
}

export function passwordResetEmail(user: Pick<User, "email" | "displayName">, token: string): EmailMessage {
  const url = `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  return {
    to: user.email,
    subject: "Reset your password",
    text: `Hello ${user.displayName},\n\nUse this link to choose a new password. It expires in 1 hour and can be used once. Resetting your password signs out every active session.\n\n${url}\n\nIf you did not request this, ignore this email; your password stays unchanged.`,
    html: layout(
      "Reset your password",
      [
        `Hello ${user.displayName},`,
        "Use this link to choose a new password. It expires in 1 hour and can be used once. Resetting your password signs out every active session.",
        "If you did not request this, ignore this email; your password stays unchanged.",
      ],
      { label: "Choose a new password", url },
    ),
  };
}

export async function sendAccountEmail(message: EmailMessage): Promise<EmailDeliveryResult> {
  const provider = getEmailProvider();
  if (provider.name === "disabled") {
    return { delivered: false, provider: provider.name, reason: "disabled" };
  }
  try {
    await provider.send(message);
    return { delivered: true, provider: provider.name };
  } catch {
    return { delivered: false, provider: provider.name, reason: "delivery_failed" };
  }
}
