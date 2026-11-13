import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, sessions, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { createSessionCookie, createUser } from "../helpers/fixtures";
import {
  extractForm,
  httpGet,
  httpPostForm,
  startTestServer,
  stopTestServer,
  type CookieJar,
} from "../helpers/http-server";
import { ensureTestDatabase, truncateAll } from "../helpers/test-db";

function jarFrom(cookie: string): CookieJar {
  return new Map([["df_session", cookie.split("=")[1]]]);
}

async function loginAs(email: string, password: string, jar: CookieJar = new Map()) {
  const page = await httpGet("/login", jar);
  const form = extractForm(page.body, "email");
  form.set("email", email);
  form.set("password", password);
  return httpPostForm("/login", form, jar);
}

describe("HTTP account security — password change session revocation", () => {
  let primaryCookie: CookieJar;
  let secondaryCookie: CookieJar;
  let userId: string;
  const email = "password-revocation@test.local";
  const oldPassword = "Old-Pass-123";
  const newPassword = "New-Pass-456";

  beforeAll(async () => {
    await ensureTestDatabase();
    await truncateAll();
    await startTestServer();

    userId = await createUser("driver", email);
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(oldPassword) })
      .where(eq(users.id, userId));

    primaryCookie = jarFrom(await createSessionCookie(userId));
    secondaryCookie = jarFrom(await createSessionCookie(userId));
  });

  afterAll(async () => {
    await stopTestServer();
    await truncateAll();
  });

  it("starts with two independent working sessions", async () => {
    expect((await httpGet("/dashboard", primaryCookie)).status).toBe(200);
    expect((await httpGet("/dashboard", secondaryCookie)).status).toBe(200);
  });

  it("does not revoke sessions when the current password is wrong", async () => {
    const page = await httpGet("/dashboard/settings", primaryCookie);
    const form = extractForm(page.body, "currentPassword");
    form.set("currentPassword", "Wrong-Pass-999");
    form.set("newPassword", newPassword);
    form.set("confirmPassword", newPassword);

    const response = await httpPostForm("/dashboard/settings", form, primaryCookie);
    expect([200, 303]).toContain(response.status);
    expect(response.body).toContain("current password is incorrect");

    expect((await httpGet("/dashboard", primaryCookie)).status).toBe(200);
    expect((await httpGet("/dashboard", secondaryCookie)).status).toBe(200);
  });

  it("changes the password, keeps the current session and revokes the other", async () => {
    const page = await httpGet("/dashboard/settings", primaryCookie);
    const form = extractForm(page.body, "currentPassword");
    form.set("currentPassword", oldPassword);
    form.set("newPassword", newPassword);
    form.set("confirmPassword", newPassword);

    const response = await httpPostForm("/dashboard/settings", form, primaryCookie);
    expect([200, 303]).toContain(response.status);
    expect(response.body).toContain("Password updated");

    expect((await httpGet("/dashboard", primaryCookie)).status).toBe(200);
    const revoked = await httpGet("/dashboard", secondaryCookie);
    expect(revoked.status).toBe(307);
    expect(revoked.location).toContain("/login");

    const remaining = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, userId));
    expect(remaining).toHaveLength(1);

    const oldLogin = await loginAs(email, oldPassword);
    expect(oldLogin.body).toContain("incorrect");

    const newLoginJar: CookieJar = new Map();
    const newLogin = await loginAs(email, newPassword, newLoginJar);
    expect(newLogin.status).toBe(303);
    expect(newLogin.location).toBe("/dashboard");
    expect((await httpGet("/dashboard", newLoginJar)).status).toBe(200);
  });

  it("audits the revocation without exposing credentials or session tokens", async () => {
    const [audit] = await db
      .select({ metadata: auditLogs.metadata })
      .from(auditLogs)
      .where(eq(auditLogs.action, "auth.password_changed"))
      .orderBy(desc(auditLogs.createdAt))
      .limit(1);

    expect(audit?.metadata).toMatchObject({
      sessionsRevoked: 1,
      currentSessionRetained: true,
    });
    const serialised = JSON.stringify(audit?.metadata);
    expect(serialised).not.toContain(oldPassword);
    expect(serialised).not.toContain(newPassword);
    expect(serialised.toLowerCase()).not.toContain("hash");
  });
});
