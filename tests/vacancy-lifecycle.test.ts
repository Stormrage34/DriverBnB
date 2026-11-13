import { describe, expect, it } from "vitest";
import {
  resolveVacancyLifecycle,
  type VacancyLifecycleInput,
} from "@/lib/vacancy-lifecycle";

const NOW = new Date("2026-06-01T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function input(overrides: Partial<VacancyLifecycleInput>): VacancyLifecycleInput {
  return {
    status: "published_verified",
    reconfirmDueAt: new Date(NOW.getTime() + 5 * DAY),
    lastConfirmedAt: new Date(NOW.getTime() - 25 * DAY),
    companySuspended: false,
    now: NOW,
    ...overrides,
  };
}

describe("vacancy lifecycle policy — KI-049 / KI-016", () => {
  it("ignores draft, expired and suspended vacancies", () => {
    for (const status of ["draft", "expired", "suspended"]) {
      expect(
        resolveVacancyLifecycle(
          input({
            status,
            reconfirmDueAt: new Date(NOW.getTime() - 60 * DAY),
          }),
        ),
      ).toEqual({ action: "none", reason: "not_live" });
    }
  });

  it("never touches a vacancy of a suspended company", () => {
    expect(
      resolveVacancyLifecycle(
        input({
          companySuspended: true,
          reconfirmDueAt: new Date(NOW.getTime() - 60 * DAY),
        }),
      ),
    ).toEqual({ action: "none", reason: "company_suspended" });
  });

  it("leaves a live vacancy alone before its due date", () => {
    expect(resolveVacancyLifecycle(input({}))).toEqual({
      action: "none",
      reason: "not_due",
    });
  });

  it("marks a live vacancy reconfirmation-required on its due date", () => {
    const dueAt = new Date(NOW.getTime() - DAY);
    expect(
      resolveVacancyLifecycle(input({ reconfirmDueAt: dueAt })),
    ).toEqual({
      action: "mark_reconfirmation_required",
      nextStatus: "reconfirmation_required",
      dueAt,
      graceEndsAt: new Date(dueAt.getTime() + 7 * DAY),
    });
  });

  it("keeps a reconfirmation-required vacancy public during the grace period", () => {
    const dueAt = new Date(NOW.getTime() - 3 * DAY);
    expect(
      resolveVacancyLifecycle(
        input({ status: "reconfirmation_required", reconfirmDueAt: dueAt }),
      ),
    ).toEqual({ action: "none", reason: "within_grace" });
  });

  it("expires a reconfirmation-required vacancy after the grace period", () => {
    const dueAt = new Date(NOW.getTime() - 8 * DAY);
    expect(
      resolveVacancyLifecycle(
        input({ status: "reconfirmation_required", reconfirmDueAt: dueAt }),
      ),
    ).toEqual({
      action: "expire",
      nextStatus: "expired",
      dueAt,
      graceEndsAt: new Date(dueAt.getTime() + 7 * DAY),
    });
  });

  it("derives the due date from the last confirmation when it is missing", () => {
    const lastConfirmedAt = new Date(NOW.getTime() - 31 * DAY);
    expect(
      resolveVacancyLifecycle(
        input({ reconfirmDueAt: null, lastConfirmedAt }),
      ),
    ).toEqual({
      action: "mark_reconfirmation_required",
      nextStatus: "reconfirmation_required",
      dueAt: new Date(lastConfirmedAt.getTime() + 30 * DAY),
      graceEndsAt: new Date(lastConfirmedAt.getTime() + 37 * DAY),
    });
  });

  it("starts the grace window now for a live legacy row with no timestamps", () => {
    expect(
      resolveVacancyLifecycle(input({ reconfirmDueAt: null, lastConfirmedAt: null })),
    ).toEqual({
      action: "mark_reconfirmation_required",
      nextStatus: "reconfirmation_required",
      dueAt: NOW,
      graceEndsAt: new Date(NOW.getTime() + 7 * DAY),
    });
  });

  it("applies the same policy to a confirmed vacancy", () => {
    expect(
      resolveVacancyLifecycle(
        input({
          status: "confirmed",
          reconfirmDueAt: new Date(NOW.getTime() - DAY),
        }),
      ).action,
    ).toBe("mark_reconfirmation_required");
  });

  it("is stable when the same decision is evaluated repeatedly", () => {
    const due = input({ reconfirmDueAt: new Date(NOW.getTime() - DAY) });
    expect(resolveVacancyLifecycle(due)).toEqual(resolveVacancyLifecycle(due));

    const late = input({
      status: "reconfirmation_required",
      reconfirmDueAt: new Date(NOW.getTime() - 10 * DAY),
    });
    expect(resolveVacancyLifecycle(late)).toEqual(resolveVacancyLifecycle(late));
  });
});
