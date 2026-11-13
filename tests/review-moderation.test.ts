import { describe, expect, it } from "vitest";
import {
  allowedReviewOutcomes,
  readReviewPublicationEvidence,
  resolveReviewModerationTransition,
  type ReviewModerationContext,
  type ReviewModerationOutcome,
} from "@/lib/reviews";

const published = new Date("2026-01-10T10:00:00Z");
const moderated = new Date("2026-01-11T10:00:00Z");

function context(overrides: Partial<ReviewModerationContext>): ReviewModerationContext {
  return {
    status: "pending",
    publishedAt: null,
    moderatedAt: null,
    ...overrides,
  };
}

const ALL_OUTCOMES: ReviewModerationOutcome[] = ["publish", "reject", "remove", "under_review"];

describe("review moderation transition model — KI-071", () => {
  it("publishes, rejects or starts review from pending, but never removes", () => {
    const pending = context({ status: "pending" });

    expect(resolveReviewModerationTransition(pending, "publish")).toEqual({
      ok: true,
      nextStatus: "published",
      firstPublication: true,
    });
    expect(resolveReviewModerationTransition(pending, "reject")).toEqual({
      ok: true,
      nextStatus: "rejected",
      firstPublication: false,
    });
    expect(resolveReviewModerationTransition(pending, "under_review")).toEqual({
      ok: true,
      nextStatus: "under_review",
      firstPublication: false,
    });
    expect(resolveReviewModerationTransition(pending, "remove")).toEqual({
      ok: false,
      reason: "remove_requires_publication",
    });
  });

  it("rejects or publishes a never-published review only when a recorded transition proves it", () => {
    const underReview = context({
      status: "under_review",
      publishedAt: null,
      moderatedAt: moderated,
      evidence: { enteredUnderReviewFromPending: true, everPublished: false },
    });

    expect(resolveReviewModerationTransition(underReview, "publish")).toEqual({
      ok: true,
      nextStatus: "published",
      firstPublication: true,
    });
    expect(resolveReviewModerationTransition(underReview, "reject")).toEqual({
      ok: true,
      nextStatus: "rejected",
      firstPublication: false,
    });
    expect(resolveReviewModerationTransition(underReview, "remove")).toEqual({
      ok: false,
      reason: "remove_requires_publication",
    });
  });

  it("does not treat moderatedAt as proof that a review was never published", () => {
    const assumedNeverPublished = context({
      status: "under_review",
      publishedAt: null,
      moderatedAt: moderated,
    });

    for (const outcome of ALL_OUTCOMES) {
      expect(resolveReviewModerationTransition(assumedNeverPublished, outcome)).toEqual({
        ok: false,
        reason: "publication_history_unknown",
      });
    }
    expect(allowedReviewOutcomes(assumedNeverPublished)).toEqual([]);
  });

  it("fails closed when recorded history says published but publishedAt is null", () => {
    const inconsistent = context({
      status: "under_review",
      publishedAt: null,
      moderatedAt: moderated,
      evidence: { enteredUnderReviewFromPending: true, everPublished: true },
    });

    expect(resolveReviewModerationTransition(inconsistent, "publish")).toEqual({
      ok: false,
      reason: "publication_history_conflict",
    });
  });

  it("fails closed for a legacy under-review row with no publication history", () => {
    const ambiguous = context({
      status: "under_review",
      publishedAt: null,
      moderatedAt: null,
    });

    for (const outcome of ALL_OUTCOMES) {
      expect(resolveReviewModerationTransition(ambiguous, outcome)).toEqual({
        ok: false,
        reason: "publication_history_unknown",
      });
    }
    expect(allowedReviewOutcomes(ambiguous)).toEqual([]);
  });

  it("allows publish or remove, but not reject, for a previously published review under review", () => {
    const reopened = context({
      status: "under_review",
      publishedAt: published,
      moderatedAt: moderated,
    });

    expect(resolveReviewModerationTransition(reopened, "publish")).toEqual({
      ok: true,
      nextStatus: "published",
      firstPublication: false,
    });
    expect(resolveReviewModerationTransition(reopened, "remove")).toEqual({
      ok: true,
      nextStatus: "removed",
      firstPublication: false,
    });
    expect(resolveReviewModerationTransition(reopened, "reject")).toEqual({
      ok: false,
      reason: "reject_requires_unpublished",
    });
  });

  it("reopens and removes a published review, but cannot publish or reject it again", () => {
    const live = context({ status: "published", publishedAt: published, moderatedAt: moderated });

    expect(resolveReviewModerationTransition(live, "under_review")).toEqual({
      ok: true,
      nextStatus: "under_review",
      firstPublication: false,
    });
    expect(resolveReviewModerationTransition(live, "remove")).toEqual({
      ok: true,
      nextStatus: "removed",
      firstPublication: false,
    });
    expect(resolveReviewModerationTransition(live, "publish")).toEqual({
      ok: false,
      reason: "already_published",
    });
    expect(resolveReviewModerationTransition(live, "reject")).toEqual({
      ok: false,
      reason: "use_remove",
    });
  });

  it("treats rejected and removed reviews as terminal for ordinary moderation", () => {
    for (const status of ["rejected", "removed"]) {
      for (const outcome of ALL_OUTCOMES) {
        expect(
          resolveReviewModerationTransition(
            context({ status, publishedAt: status === "removed" ? published : null, moderatedAt: moderated }),
            outcome,
          ),
        ).toEqual({ ok: false, reason: "terminal_state" });
      }
      expect(allowedReviewOutcomes(context({ status }))).toEqual([]);
    }
  });

  it("refuses a repeated under-review decision", () => {
    expect(
      resolveReviewModerationTransition(
        context({
          status: "under_review",
          moderatedAt: moderated,
          evidence: { enteredUnderReviewFromPending: true, everPublished: false },
        }),
        "under_review",
      ),
    ).toEqual({ ok: false, reason: "already_under_review" });
  });

  it("rejects an unknown status rather than guessing", () => {
    expect(
      resolveReviewModerationTransition(context({ status: "archived" }), "publish"),
    ).toEqual({ ok: false, reason: "unknown_status" });
  });

  it("lists only the outcomes the current state allows", () => {
    expect(allowedReviewOutcomes(context({ status: "pending" }))).toEqual([
      "publish",
      "reject",
      "under_review",
    ]);
    expect(
      allowedReviewOutcomes(context({ status: "under_review", publishedAt: published, moderatedAt: moderated })),
    ).toEqual(["publish", "remove"]);
    expect(allowedReviewOutcomes(context({ status: "published", publishedAt: published }))).toEqual([
      "remove",
      "under_review",
    ]);
  });
});

describe("review publication evidence", () => {
  it("recognises a recorded pending to under-review transition", () => {
    expect(
      readReviewPublicationEvidence([
        { metadata: { previousStatus: "pending", nextStatus: "under_review" } },
      ]),
    ).toEqual({ enteredUnderReviewFromPending: true, everPublished: false });
  });

  it("recognises a recorded publication", () => {
    expect(
      readReviewPublicationEvidence([
        { metadata: { previousStatus: "pending", nextStatus: "published", firstPublication: true } },
      ]),
    ).toEqual({ enteredUnderReviewFromPending: false, everPublished: true });
  });

  it("reports no evidence for an empty or unrelated history", () => {
    expect(readReviewPublicationEvidence([])).toEqual({
      enteredUnderReviewFromPending: false,
      everPublished: false,
    });
    expect(
      readReviewPublicationEvidence([{ metadata: { previousStatus: "published", nextStatus: "under_review" } }]),
    ).toEqual({ enteredUnderReviewFromPending: false, everPublished: false });
  });
});
