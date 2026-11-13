/**
 * Employer reply policy.
 *
 * Replies are allowed only on reviews that have already passed moderation and
 * are publicly visible. Allowing a reply to a pending or removed review would
 * leak moderation state and let an employer respond to content drivers cannot
 * see.
 */
export function canEmployerReplyToReview(reviewStatus: string): boolean {
  return reviewStatus === "published";
}

/**
 * Employer replies are pre-moderated: they are stored as `pending` and only
 * public queries select `published` responses.
 */
export const INITIAL_RESPONSE_STATUS = "pending";

/* ------------------------------------------------------------------ */
/* Review moderation transitions (KI-071)                             */
/* ------------------------------------------------------------------ */

export type ReviewModerationOutcome = "publish" | "reject" | "remove" | "under_review";

export type ReviewModerationContext = {
  status: string;
  publishedAt: Date | null;
  moderatedAt: Date | null;
  /**
   * Independent moderation-history evidence. `moderatedAt` alone never proves
   * that a review was not published; only recorded transitions can.
   */
  evidence?: ReviewPublicationEvidence;
};

export type ReviewPublicationEvidence = {
  /** A recorded transition moved this review from pending to under_review. */
  enteredUnderReviewFromPending: boolean;
  /** A recorded transition published this review at some point. */
  everPublished: boolean;
};

export type ReviewModerationBlockReason =
  | "terminal_state"
  | "publication_history_unknown"
  | "publication_history_conflict"
  | "remove_requires_publication"
  | "reject_requires_unpublished"
  | "already_published"
  | "already_under_review"
  | "use_remove"
  | "unknown_status";

export type ReviewModerationResolution =
  | { ok: true; nextStatus: "published" | "rejected" | "removed" | "under_review"; firstPublication: boolean }
  | { ok: false; reason: ReviewModerationBlockReason };

/**
 * The only place that decides whether a review moderation outcome is legal.
 *
 * `under_review` is ambiguous on its own: it is used both for a review that
 * was never published and for a published review reopened for investigation.
 * `publishedAt` distinguishes them without a schema change. When `publishedAt`
 * is null, a non-null `moderatedAt` is not proof of anything; only recorded
 * moderation transitions may establish that the review was never published.
 * Everything else fails closed instead of inferring history.
 */
export function resolveReviewModerationTransition(
  context: ReviewModerationContext,
  outcome: ReviewModerationOutcome,
): ReviewModerationResolution {
  const { status, publishedAt, evidence } = context;

  if (status === "rejected" || status === "removed") {
    return { ok: false, reason: "terminal_state" };
  }

  if (status === "pending") {
    if (outcome === "publish") return { ok: true, nextStatus: "published", firstPublication: publishedAt === null };
    if (outcome === "reject") return { ok: true, nextStatus: "rejected", firstPublication: false };
    if (outcome === "under_review") return { ok: true, nextStatus: "under_review", firstPublication: false };
    return { ok: false, reason: "remove_requires_publication" };
  }

  if (status === "under_review") {
    if (publishedAt === null) {
      if (evidence?.everPublished) {
        return { ok: false, reason: "publication_history_conflict" };
      }
      if (!evidence?.enteredUnderReviewFromPending) {
        return { ok: false, reason: "publication_history_unknown" };
      }
      if (outcome === "publish") return { ok: true, nextStatus: "published", firstPublication: true };
      if (outcome === "reject") return { ok: true, nextStatus: "rejected", firstPublication: false };
      if (outcome === "under_review") return { ok: false, reason: "already_under_review" };
      return { ok: false, reason: "remove_requires_publication" };
    }
    if (outcome === "publish") return { ok: true, nextStatus: "published", firstPublication: false };
    if (outcome === "remove") return { ok: true, nextStatus: "removed", firstPublication: false };
    if (outcome === "reject") return { ok: false, reason: "reject_requires_unpublished" };
    return { ok: false, reason: "already_under_review" };
  }

  if (status === "published") {
    if (outcome === "under_review") return { ok: true, nextStatus: "under_review", firstPublication: false };
    if (outcome === "remove") return { ok: true, nextStatus: "removed", firstPublication: false };
    if (outcome === "publish") return { ok: false, reason: "already_published" };
    return { ok: false, reason: "use_remove" };
  }

  return { ok: false, reason: "unknown_status" };
}

/**
 * Derive publication evidence from recorded moderation events. These events
 * are written by `moderateReviewAction`; a missing entry means no reliable
 * history exists.
 */
export function readReviewPublicationEvidence(
  events: Array<{ metadata: Record<string, unknown> | null | undefined }>,
): ReviewPublicationEvidence {
  let enteredUnderReviewFromPending = false;
  let everPublished = false;

  for (const event of events) {
    const metadata = event.metadata ?? {};
    if (metadata.nextStatus === "published" || metadata.firstPublication === true) {
      everPublished = true;
    }
    if (metadata.previousStatus === "pending" && metadata.nextStatus === "under_review") {
      enteredUnderReviewFromPending = true;
    }
  }

  return { enteredUnderReviewFromPending, everPublished };
}

/**
 * Outcomes the UI may offer for a review. The server resolver remains
 * authoritative; this list only stops moderators choosing a prohibited action.
 */
export function allowedReviewOutcomes(context: ReviewModerationContext): ReviewModerationOutcome[] {
  return (["publish", "reject", "remove", "under_review"] as const).filter(
    (outcome) => resolveReviewModerationTransition(context, outcome).ok,
  );
}
