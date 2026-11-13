import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";

export const TEST_HTTP_PORT = Number(process.env.TEST_HTTP_PORT ?? 3211);
export const TEST_HTTP_BASE = `http://127.0.0.1:${TEST_HTTP_PORT}`;

let server: ChildProcess | null = null;
let output = "";

export async function startTestServer(): Promise<string> {
  if (server) return TEST_HTTP_BASE;

  const databaseUrl =
    process.env.TEST_DATABASE_URL ??
    "postgres://postgres@127.0.0.1:55432/driverfirst_test";

  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(TEST_HTTP_PORT)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "production",
        DATABASE_URL: databaseUrl,
        TEST_DATABASE_URL: databaseUrl,
        EMAIL_PROVIDER: "test",
        APP_BASE_URL: TEST_HTTP_BASE,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  server.stdout?.on("data", (chunk) => {
    output += chunk.toString();
  });
  server.stderr?.on("data", (chunk) => {
    output += chunk.toString();
  });

  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${TEST_HTTP_BASE}/login`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) return TEST_HTTP_BASE;
    } catch {
      // server is still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Test server did not start.\n${output.slice(-4000)}`);
}

export async function stopTestServer(): Promise<void> {
  if (!server) return;
  const child = server;
  server = null;
  child.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 5_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export type CookieJar = Map<string, string>;

export function sessionToken(userId: string): { token: string; tokenHash: string } {
  const token = `test_${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function cookieHeader(jar: CookieJar): string {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

export function absorbCookies(jar: CookieJar, response: Response): void {
  const setCookies = response.headers.getSetCookie();
  for (const header of setCookies) {
    const [pair] = header.split(";");
    const index = pair.indexOf("=");
    if (index > 0) jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}

export async function httpGet(path: string, jar: CookieJar = new Map()): Promise<{
  status: number;
  location: string | null;
  body: string;
}> {
  const headers: Record<string, string> = {};
  const cookie = cookieHeader(jar);
  if (cookie) headers.cookie = cookie;
  const response = await fetch(`${TEST_HTTP_BASE}${path}`, {
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  absorbCookies(jar, response);
  return {
    status: response.status,
    location: response.headers.get("location"),
    body: await response.text(),
  };
}

export async function httpPostForm(
  path: string,
  form: FormData,
  jar: CookieJar = new Map(),
): Promise<{ status: number; location: string | null; body: string }> {
  const headers: Record<string, string> = { origin: TEST_HTTP_BASE };
  const cookie = cookieHeader(jar);
  if (cookie) headers.cookie = cookie;
  const response = await fetch(`${TEST_HTTP_BASE}${path}`, {
    method: "POST",
    headers,
    body: form,
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  absorbCookies(jar, response);
  return {
    status: response.status,
    location: response.headers.get("location"),
    body: await response.text(),
  };
}

/**
 * Extract a rendered form by a required field name. The built app is posted
 * without JavaScript, using React's hidden action fields.
 */
export function extractForm(
  html: string,
  requiredField: string,
  requiredValue?: string,
): FormData {
  const formBlocks = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/gi)];
  const block = formBlocks
    .map((match) => match[1] ?? "")
    .find(
      (candidate) =>
        candidate.includes(`name="${requiredField}"`) &&
        (!requiredValue || candidate.includes(`value="${requiredValue}"`)),
    );

  if (!block) {
    throw new Error(`No form containing ${requiredField} was found.`);
  }

  const form = new FormData();

  for (const match of block.matchAll(/<input\b[^>]*>/gi)) {
    const tag = match[0];
    const name = attr(tag, "name");
    if (!name) continue;
    const type = (attr(tag, "type") ?? "text").toLowerCase();
    if (type === "submit" || type === "button") continue;
    if ((type === "checkbox" || type === "radio") && !/\bchecked\b/i.test(tag)) continue;
    form.append(name, attr(tag, "value") ?? "");
  }

  for (const match of block.matchAll(/<textarea\b[^>]*>([\s\S]*?)<\/textarea>/gi)) {
    const name = attr(match[0], "name");
    if (!name) continue;
    form.append(name, decodeEntities(match[1] ?? ""));
  }

  for (const match of block.matchAll(/<select\b[^>]*>([\s\S]*?)<\/select>/gi)) {
    const name = attr(match[0], "name");
    if (!name) continue;
    const options = [...match[1].matchAll(/<option\b[^>]*>([\s\S]*?)<\/option>/gi)];
    const selected =
      options.find((option) => /\bselected\b/i.test(option[0])) ?? options[0];
    form.append(
      name,
      selected
        ? (attr(selected[0], "value") ?? decodeEntities(selected[1] ?? ""))
        : "",
    );
  }

  return form;
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match ? decodeEntities(match[1]) : null;
}

function decodeEntities(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}
