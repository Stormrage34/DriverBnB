import { describe, expect, it } from "vitest";
import { canEmployerReplyToReview, INITIAL_RESPONSE_STATUS } from "@/lib/reviews";

describe("employer reply policy — H4", () => {
  it("allows a reply only to a published review", () => {
    expect(canEmployerReplyToReview("published")).toBe(true);
  });

  it.each(["pending", "under_review", "rejected", "removed", "unknown"])(
    "rejects a reply to a review with status %s",
    (status) => {
      expect(canEmployerReplyToReview(status)).toBe(false);
    },
  );

  it("pre-moderates replies by starting them as pending", () => {
    expect(INITIAL_RESPONSE_STATUS).toBe("pending");
  });
});
