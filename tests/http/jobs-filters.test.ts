import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { httpGet, startTestServer, stopTestServer } from "../helpers/http-server";
import { ensureTestDatabase, truncateAll } from "../helpers/test-db";

describe("HTTP job filter validation", () => {
  beforeAll(async () => {
    await ensureTestDatabase();
    await truncateAll();
    await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it("renders an empty board instead of failing on unknown enum and numeric filters", async () => {
    const response = await httpGet(
      "/jobs?category=not-a-category&country=XX&accommodation=not-real&loading=not-real&payMin=abc&payMax=-4&page=NaN&sort=drop-table",
    );
    expect(response.status).toBe(200);
    expect(response.body).toContain("No live vacancies yet");
    expect(response.body).not.toContain("Application error");
  });

  it("clamps an out-of-range page instead of issuing a negative offset", async () => {
    const response = await httpGet("/jobs?page=-99");
    expect(response.status).toBe(200);
    expect(response.body).toContain("No live vacancies yet");
  });

  it("keeps the filter form usable without JavaScript", async () => {
    const response = await httpGet("/jobs");
    expect(response.status).toBe(200);
    expect(response.body).toContain('action="/jobs"');
    expect(response.body).toContain("Apply filters");
  });
});
