import { describe, expect, it } from "vitest";
import {
  allowedVacancyModerationOutcomes,
  resolveVacancyModerationTransition,
  type VacancyModerationContext,
} from "@/lib/vacancy-moderation";

const BASE: VacancyModerationContext = {
  currentStatus: "published_verified",
  suspendedFromStatus: null,
  recordedPreviousStatus: null,
  companySuspended: false,
  companyVerificationStatus: "verified",
  companyVerificationVersion: 1,
  publishability: { ok: true },
  reconfirmationOverdue: false,
};

function context(overrides: Partial<VacancyModerationContext>): VacancyModerationContext {
  return { ...BASE, ...overrides };
}

describe("vacancy moderation transitions — KI-070", () => {
  it("suspends a live vacancy and records the previous public state", () => {
    expect(resolveVacancyModerationTransition(BASE, "suspend")).toEqual({
      ok: true,
      nextStatus: "suspended",
      previousStatus: "published_verified",
    });
  });

  it("refuses to suspend a draft, expired or already suspended vacancy", () => {
    expect(resolveVacancyModerationTransition(context({ currentStatus: "draft" }), "suspend")).toEqual({
      ok: false,
      reason: "not_public",
    });
    expect(
      resolveVacancyModerationTransition(context({ currentStatus: "expired" }), "suspend"),
    ).toEqual({ ok: false, reason: "not_public" });
    expect(
      resolveVacancyModerationTransition(context({ currentStatus: "suspended" }), "suspend"),
    ).toEqual({ ok: false, reason: "already_suspended" });
  });

  it("expires a live or suspended vacancy, but not a draft", () => {
    expect(resolveVacancyModerationTransition(BASE, "expire")).toEqual({
      ok: true,
      nextStatus: "expired",
      previousStatus: "published_verified",
    });
    expect(
      resolveVacancyModerationTransition(context({ currentStatus: "suspended" }), "expire"),
    ).toEqual({ ok: true, nextStatus: "expired", previousStatus: "suspended" });
    expect(resolveVacancyModerationTransition(context({ currentStatus: "draft" }), "expire")).toEqual({
      ok: false,
      reason: "not_public",
    });
  });

  it("restores only a suspended vacancy whose company is active", () => {
    expect(resolveVacancyModerationTransition(BASE, "restore")).toEqual({
      ok: false,
      reason: "not_suspended",
    });
    expect(
      resolveVacancyModerationTransition(
        context({ currentStatus: "suspended", suspendedFromStatus: "published_verified" }),
        "restore",
      ),
    ).toEqual({
      ok: true,
      nextStatus: "published_verified",
      previousStatus: "published_verified",
    });
    expect(
      resolveVacancyModerationTransition(
        context({
          currentStatus: "suspended",
          suspendedFromStatus: "published_verified",
          companySuspended: true,
        }),
        "restore",
      ),
    ).toEqual({ ok: false, reason: "company_suspended" });
  });

  it("fails closed when no previous public state is recorded", () => {
    expect(
      resolveVacancyModerationTransition(context({ currentStatus: "suspended" }), "restore"),
    ).toEqual({ ok: false, reason: "previous_status_unknown" });
  });

  it("accepts an audit-recorded previous state for an individual suspension", () => {
    expect(
      resolveVacancyModerationTransition(
        context({ currentStatus: "suspended", recordedPreviousStatus: "confirmed" }),
        "restore",
      ),
    ).toEqual({ ok: true, nextStatus: "confirmed", previousStatus: "confirmed" });
  });

  it("never restores a draft or expired previous state", () => {
    for (const previous of ["draft", "expired", "suspended"]) {
      expect(
        resolveVacancyModerationTransition(
          context({ currentStatus: "suspended", recordedPreviousStatus: previous }),
          "restore",
        ),
      ).toEqual({ ok: false, reason: "previous_status_not_restorable" });
    }
  });

  it("never restores an incomplete vacancy to a public state", () => {
    expect(
      resolveVacancyModerationTransition(
        context({
          currentStatus: "suspended",
          suspendedFromStatus: "published_verified",
          publishability: { ok: false, missing: ["Gross salary (minimum)", "Rotation"] },
        }),
        "restore",
      ),
    ).toEqual({
      ok: false,
      reason: "incomplete",
      missing: ["Gross salary (minimum)", "Rotation"],
    });
  });

  it("derives the verified label from current company trust", () => {
    expect(
      resolveVacancyModerationTransition(
        context({
          currentStatus: "suspended",
          suspendedFromStatus: "published_verified",
          companyVerificationStatus: "submitted",
          companyVerificationVersion: 0,
        }),
        "restore",
      ),
    ).toEqual({ ok: true, nextStatus: "published_unverified", previousStatus: "published_verified" });
  });

  it("does not present an overdue confirmation as freshly confirmed", () => {
    expect(
      resolveVacancyModerationTransition(
        context({
          currentStatus: "suspended",
          suspendedFromStatus: "confirmed",
          reconfirmationOverdue: true,
        }),
        "restore",
      ),
    ).toEqual({
      ok: true,
      nextStatus: "reconfirmation_required",
      previousStatus: "confirmed",
    });
  });

  it("lists only the actions available for each state", () => {
    expect(allowedVacancyModerationOutcomes(BASE)).toEqual(["suspend", "expire"]);
    expect(
      allowedVacancyModerationOutcomes(context({ currentStatus: "suspended" })),
    ).toEqual(["expire"]);
    expect(
      allowedVacancyModerationOutcomes(
        context({ currentStatus: "suspended", suspendedFromStatus: "published_unverified" }),
      ),
    ).toEqual(["restore", "expire"]);
    expect(allowedVacancyModerationOutcomes(context({ currentStatus: "draft" }))).toEqual([]);
  });
});
