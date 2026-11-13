import { describe, expect, it } from "vitest";
import {
  isCompanySuspended,
  resolveVacancyRestoration,
} from "@/lib/company-suspension";

const BASE = {
  currentStatus: "suspended",
  previousStatus: "published_unverified",
  publishable: true,
  companyStatus: "verified",
  companyVerificationVersion: 1,
};

describe("company suspension authority", () => {
  it("treats either suspendedAt or legacy verification suspended as suspended", () => {
    expect(isCompanySuspended({ suspendedAt: new Date(), verificationStatus: "verified" })).toBe(true);
    expect(isCompanySuspended({ suspendedAt: null, verificationStatus: "suspended" })).toBe(true);
    expect(isCompanySuspended({ suspendedAt: null, verificationStatus: "verified" })).toBe(false);
  });
});

describe("vacancy restoration", () => {
  it("does not touch a vacancy that is not suspended", () => {
    expect(
      resolveVacancyRestoration({ ...BASE, currentStatus: "published_unverified" }),
    ).toBe("published_unverified");
  });

  it("does not restore ambiguous or individually suspended rows", () => {
    expect(resolveVacancyRestoration({ ...BASE, previousStatus: null })).toBe("suspended");
    expect(resolveVacancyRestoration({ ...BASE, previousStatus: "expired" })).toBe("suspended");
    expect(resolveVacancyRestoration({ ...BASE, previousStatus: "draft" })).toBe("suspended");
  });

  it("sends invalid vacancies to draft rather than public view", () => {
    expect(
      resolveVacancyRestoration({
        ...BASE,
        previousStatus: "published_verified",
        publishable: false,
      }),
    ).toBe("draft");
  });

  it("restores a verified label only for a trusted company", () => {
    expect(
      resolveVacancyRestoration({
        ...BASE,
        previousStatus: "published_verified",
        companyVerificationVersion: 0,
      }),
    ).toBe("published_unverified");
    expect(
      resolveVacancyRestoration({
        ...BASE,
        previousStatus: "published_unverified",
        companyVerificationVersion: 1,
      }),
    ).toBe("published_verified");
  });

  it("preserves confirmed and reconfirmation-required states when publishable", () => {
    expect(resolveVacancyRestoration({ ...BASE, previousStatus: "confirmed" })).toBe("confirmed");
    expect(
      resolveVacancyRestoration({ ...BASE, previousStatus: "reconfirmation_required" }),
    ).toBe("reconfirmation_required");
  });
});
