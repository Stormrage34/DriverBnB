import { describe, expect, it } from "vitest";
import type { Vacancy } from "@/db/schema";
import {
  checkPublishable,
  computeInfoScore,
  resolveVacancySave,
  resolveVacancyTransition,
} from "@/lib/vacancy";

const COMPLETE = {
  title: "International C+E reefer driver",
  country: "NL",
  contractingEntity: "Demo Transport B.V.",
  transportCategory: "reefer",
  licenceRequirements: ["C+E", "Code 95"],
  contractType: "permanent",
  grossPayMin: 3000,
  payStructure: "Base salary plus night-out allowance; holiday pay accrued monthly.",
  workingPattern: "International tramping, Monday to Friday",
  rotation: "3 weeks out / 1 week home",
  homeTime: "2–3 days per rotation, weekends at home where possible",
  loadingUnloading: "none",
  accommodation: "provided_free",
  weeklyRest: "Truck parked at depot; hotel provided for 45-hour rest",
  vehicleType: "Volvo FH 2022",
  operatingCountries: ["NL", "DE", "DK"],
  languagesRequired: ["English"],
  applicationMethod: "platform_message",
} as unknown as Partial<Vacancy>;

describe("checkPublishable", () => {
  it("rejects an empty draft and names the missing fields", () => {
    const result = checkPublishable({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toContain("Gross salary (minimum)");
      expect(result.missing).toContain("Accommodation arrangement");
    }
  });

  it("accepts a complete vacancy", () => {
    expect(checkPublishable(COMPLETE)).toEqual({ ok: true });
  });
});

describe("computeInfoScore", () => {
  it("returns 0 for an empty draft", () => {
    expect(computeInfoScore({})).toBe(0);
  });

  it("returns 100 when every comparable field is present", () => {
    expect(computeInfoScore(COMPLETE)).toBe(100);
  });
});

describe("resolveVacancySave — published vacancy integrity", () => {
  it("allows an incomplete draft when the employer is not publishing", () => {
    const result = resolveVacancySave({
      existingStatus: null,
      wantsPublish: false,
      companyVerified: false,
      draft: {},
    });
    expect(result).toEqual({ ok: true, nextStatus: "draft", requiresPublishable: false });
  });

  it("blocks publishing an incomplete vacancy", () => {
    const result = resolveVacancySave({
      existingStatus: null,
      wantsPublish: true,
      companyVerified: false,
      draft: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Before publishing, complete/);
  });

  it("publishes a complete vacancy from an unverified company as published_unverified", () => {
    const result = resolveVacancySave({
      existingStatus: null,
      wantsPublish: true,
      companyVerified: false,
      draft: COMPLETE,
    });
    expect(result).toEqual({
      ok: true,
      nextStatus: "published_unverified",
      requiresPublishable: true,
    });
  });

  it("publishes a complete vacancy from a verified company as published_verified", () => {
    const result = resolveVacancySave({
      existingStatus: "draft",
      wantsPublish: true,
      companyVerified: true,
      draft: COMPLETE,
    });
    expect(result).toEqual({
      ok: true,
      nextStatus: "published_verified",
      requiresPublishable: true,
    });
  });

  it("refuses to save a live vacancy whose pay was cleared, even without re-ticking publish", () => {
    const result = resolveVacancySave({
      existingStatus: "published_verified",
      wantsPublish: false,
      companyVerified: true,
      draft: { ...COMPLETE, grossPayMin: null },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/A live vacancy cannot be saved with missing information/);
      expect(result.error).toMatch(/Gross salary/);
    }
  });

  it("preserves the live status when a complete live vacancy is edited", () => {
    const result = resolveVacancySave({
      existingStatus: "published_verified",
      wantsPublish: false,
      companyVerified: true,
      draft: COMPLETE,
    });
    expect(result).toEqual({
      ok: true,
      nextStatus: "published_verified",
      requiresPublishable: true,
    });
  });

  it("does not let an employer republish a suspended vacancy", () => {
    const result = resolveVacancySave({
      existingStatus: "suspended",
      wantsPublish: true,
      companyVerified: true,
      draft: COMPLETE,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/suspended by moderation/);
  });

  it("keeps a confirmed vacancy confirmed when the employer re-saves it", () => {
    const result = resolveVacancySave({
      existingStatus: "confirmed",
      wantsPublish: true,
      companyVerified: true,
      draft: COMPLETE,
    });
    expect(result).toEqual({
      ok: true,
      nextStatus: "confirmed",
      requiresPublishable: true,
    });
  });

  it("allows republishing an expired complete vacancy", () => {
    const result = resolveVacancySave({
      existingStatus: "expired",
      wantsPublish: true,
      companyVerified: false,
      draft: COMPLETE,
    });
    expect(result).toEqual({
      ok: true,
      nextStatus: "published_unverified",
      requiresPublishable: true,
    });
  });
});

describe("resolveVacancyTransition — H2 state machine", () => {
  it("refuses to reconfirm a draft", () => {
    const result = resolveVacancyTransition({
      currentStatus: "draft",
      transition: "reconfirm",
      draft: COMPLETE,
      companyVerified: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already live/);
  });

  it("refuses to publish a suspended vacancy", () => {
    const result = resolveVacancyTransition({
      currentStatus: "suspended",
      transition: "publish",
      draft: COMPLETE,
      companyVerified: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/suspended by moderation/);
  });

  it("refuses to reconfirm a suspended vacancy", () => {
    const result = resolveVacancyTransition({
      currentStatus: "suspended",
      transition: "reconfirm",
      draft: COMPLETE,
      companyVerified: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/suspended by moderation/);
  });

  it("reconfirms a complete live vacancy", () => {
    const result = resolveVacancyTransition({
      currentStatus: "published_verified",
      transition: "reconfirm",
      draft: COMPLETE,
      companyVerified: true,
    });
    expect(result).toEqual({ ok: true, nextStatus: "confirmed" });
  });

  it("refuses to reconfirm a live vacancy whose conditions are incomplete", () => {
    const result = resolveVacancyTransition({
      currentStatus: "published_unverified",
      transition: "reconfirm",
      draft: { ...COMPLETE, weeklyRest: null },
      companyVerified: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Before reconfirming/);
  });

  it("keeps a confirmed vacancy confirmed when publish is invoked again", () => {
    const result = resolveVacancyTransition({
      currentStatus: "confirmed",
      transition: "publish",
      draft: COMPLETE,
      companyVerified: true,
    });
    expect(result).toEqual({ ok: true, nextStatus: "confirmed" });
  });

  it("publishes an expired complete vacancy", () => {
    const result = resolveVacancyTransition({
      currentStatus: "expired",
      transition: "publish",
      draft: COMPLETE,
      companyVerified: false,
    });
    expect(result).toEqual({ ok: true, nextStatus: "published_unverified" });
  });

  it("refuses to publish an incomplete draft through the transition action", () => {
    const result = resolveVacancyTransition({
      currentStatus: "draft",
      transition: "publish",
      draft: { ...COMPLETE, grossPayMin: null },
      companyVerified: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Gross salary/);
  });
});
