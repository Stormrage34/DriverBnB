import { describe, expect, it } from "vitest";
import {
  allowedVerificationOutcomes,
  buildIdentitySnapshot,
  buildOperationalValues,
  diffIdentityValues,
  diffOperationalValues,
  getVerificationPresentation,
  identityChecked,
  isFullyVerified,
  readIdentitySnapshot,
  resolveProfileUpdateStatus,
  resolveSubmissionStatus,
  resolveVerificationTransition,
  roleChecked,
  vacancyStatusForCompanyVerification,
  type IdentityValues,
  type VerificationOutcome,
} from "@/lib/verification";
import { identityHash } from "@/lib/verification-hash";

const BASE_IDENTITY: IdentityValues = {
  legalName: "Demo Transport B.V.",
  tradingName: "Demo Transport",
  country: "NL",
  registrationNumber: "12345678",
  registeredAddress: "Havenweg 1, Rotterdam",
  contractingEntity: "Demo Transport B.V.",
  companyType: "direct_employer",
  recruitsDirectly: true,
};

const STATUSES = [
  "unverified",
  "submitted",
  "identity_checked",
  "direct_employer_checked",
  "verified",
  "suspended",
] as const;

const OUTCOMES: VerificationOutcome[] = [
  "identity_checked",
  "direct_employer_checked",
  "verified",
  "needs_information",
  "rejected",
];

const EXPECTED: Record<string, VerificationOutcome[]> = {
  unverified: [],
  submitted: ["identity_checked", "needs_information", "rejected"],
  identity_checked: ["direct_employer_checked", "needs_information", "rejected"],
  direct_employer_checked: ["verified", "needs_information", "rejected"],
  verified: [],
  suspended: [],
};

describe("verification state model", () => {
  it("derives identity and role checks from the single status", () => {
    expect(STATUSES.map((status) => identityChecked(status, 1))).toEqual([false, false, true, true, true, false]);
    expect(STATUSES.map((status) => roleChecked(status, 1))).toEqual([false, false, false, true, true, false]);
  });

  it("treats only a trusted verified status as fully verified", () => {
    for (const status of STATUSES) {
      expect(isFullyVerified(status, 1)).toBe(status === "verified");
    }
    expect(isFullyVerified("verified", 0)).toBe(false);
    expect(identityChecked("verified", 0)).toBe(false);
    expect(roleChecked("verified", 0)).toBe(false);
    expect(identityChecked("verified", 1)).toBe(true);
  });

  it("labels a legacy verified company as requiring review", () => {
    const presentation = getVerificationPresentation("verified", "direct_employer", 0);
    expect(presentation.label).toBe("Verification requires review");
    expect(presentation.stage).toBe("none");
  });

  it("allows exactly the permitted outcomes for every status", () => {
    for (const status of STATUSES) {
      expect(allowedVerificationOutcomes(status)).toEqual(EXPECTED[status]);
    }
  });

  it("resolves every permitted and prohibited transition", () => {
    for (const status of STATUSES) {
      for (const outcome of OUTCOMES) {
        const result = resolveVerificationTransition({ currentStatus: status, outcome });
        const permitted = EXPECTED[status].includes(outcome);
        expect(result.ok, `${status} -> ${outcome}`).toBe(permitted);
        if (result.ok) {
          if (outcome === "needs_information") {
            expect(result.nextStatus).toBe(status);
            expect(result.decision).toBe("needs_information");
          } else if (outcome === "rejected") {
            expect(result.nextStatus).toBe("unverified");
            expect(result.decision).toBe("rejected");
          } else {
            expect(result.nextStatus).toBe(outcome);
            expect(result.decision).toBe("approved");
          }
        }
      }
    }
  });

  it("never permits skipping the identity or role stage", () => {
    expect(
      resolveVerificationTransition({ currentStatus: "submitted", outcome: "verified" }).ok,
    ).toBe(false);
    expect(
      resolveVerificationTransition({
        currentStatus: "identity_checked",
        outcome: "verified",
      }).ok,
    ).toBe(false);
    expect(
      resolveVerificationTransition({
        currentStatus: "direct_employer_checked",
        outcome: "identity_checked",
      }).ok,
    ).toBe(false);
  });

  it("never permits movement out of verified or suspended through a decision", () => {
    for (const outcome of OUTCOMES) {
      expect(resolveVerificationTransition({ currentStatus: "verified", outcome }).ok).toBe(false);
      expect(resolveVerificationTransition({ currentStatus: "suspended", outcome }).ok).toBe(false);
    }
  });
});

describe("identity change classification", () => {
  it.each([
    "legalName",
    "tradingName",
    "country",
    "registrationNumber",
    "registeredAddress",
    "contractingEntity",
  ] as const)("classifies %s as legal identity", (field) => {
    const next = { ...BASE_IDENTITY, [field]: `${BASE_IDENTITY[field]}-changed` };
    const diff = diffIdentityValues(BASE_IDENTITY, next);
    expect(diff.legalIdentityChanged).toBe(true);
    expect(diff.classificationChanged).toBe(false);
    expect(diff.changes.map((change) => change.field)).toContain(field);
    expect(diff.changes.find((change) => change.field === field)?.category).toBe("legal_identity");
  });

  it.each(["companyType", "recruitsDirectly"] as const)(
    "classifies %s as a role/classification change",
    (field) => {
      const next =
        field === "companyType"
          ? { ...BASE_IDENTITY, companyType: "recruitment_agency" }
          : { ...BASE_IDENTITY, recruitsDirectly: false };
      const diff = diffIdentityValues(BASE_IDENTITY, next);
      expect(diff.legalIdentityChanged).toBe(false);
      expect(diff.classificationChanged).toBe(true);
      expect(diff.changes[0]?.category).toBe("classification");
    },
  );

  it("records previous and current values for moderators", () => {
    const next = { ...BASE_IDENTITY, legalName: "New Legal Name B.V." };
    const diff = diffIdentityValues(BASE_IDENTITY, next);
    const change = diff.changes.find((item) => item.field === "legalName");
    expect(change).toMatchObject({
      previous: "Demo Transport B.V.",
      current: "New Legal Name B.V.",
      label: "Registered legal name",
    });
  });

  it("detects no change", () => {
    expect(diffIdentityValues(BASE_IDENTITY, { ...BASE_IDENTITY }).hasChanges).toBe(false);
  });

  it("treats operational changes separately from identity", () => {
    const previous = buildOperationalValues({
      operatesOwnFleet: true,
      fleetSize: 20,
      sectors: ["Refrigerated"],
      website: "https://demo.example",
      businessEmail: "hr@demo.example",
      phone: null,
      contactPerson: null,
      description: null,
    });
    const next = {
      ...previous,
      fleetSize: 25,
      phone: "+31 10 000 0000",
    };
    const diff = diffOperationalValues(previous, next);
    expect(diff.changed).toBe(true);
    expect(diff.material).toBe(true);
    expect(diff.changes.map((change) => change.field)).toEqual(["fleetSize", "phone"]);
  });
});

describe("resubmission preserves completed checks", () => {
  const legalDiff = diffIdentityValues(BASE_IDENTITY, {
    ...BASE_IDENTITY,
    legalName: "Changed B.V.",
  });
  const roleDiff = diffIdentityValues(BASE_IDENTITY, {
    ...BASE_IDENTITY,
    companyType: "recruitment_agency",
  });
  const noDiff = diffIdentityValues(BASE_IDENTITY, { ...BASE_IDENTITY });

  it.each([
    ["unverified", "submitted"],
    ["submitted", "submitted"],
    ["identity_checked", "identity_checked"],
    ["direct_employer_checked", "direct_employer_checked"],
    ["verified", "verified"],
  ])("keeps %s at %s for ordinary evidence resubmission", (current, expected) => {
    expect(resolveSubmissionStatus(current, noDiff, 1)).toEqual({
      ok: true,
      nextStatus: expected,
    });
  });

  it.each([
    ["verified", "submitted"],
    ["direct_employer_checked", "submitted"],
    ["identity_checked", "submitted"],
    ["submitted", "submitted"],
    ["unverified", "submitted"],
  ])("resets %s to %s after a legal identity change", (current, expected) => {
    expect(resolveSubmissionStatus(current, legalDiff, 1)).toEqual({
      ok: true,
      nextStatus: expected,
    });
  });

  it.each([
    ["verified", "identity_checked"],
    ["direct_employer_checked", "identity_checked"],
    ["identity_checked", "identity_checked"],
    ["submitted", "submitted"],
    ["unverified", "submitted"],
  ])("invalidates only the role check for %s (expected %s)", (current, expected) => {
    expect(resolveSubmissionStatus(current, roleDiff, 1)).toEqual({
      ok: true,
      nextStatus: expected,
    });
  });

  it("blocks a suspended company from resubmitting", () => {
    expect(resolveSubmissionStatus("suspended", noDiff, 1).ok).toBe(false);
  });

  it("forces a legacy verified company back to submitted on ordinary resubmission", () => {
    expect(resolveSubmissionStatus("verified", noDiff, 0)).toEqual({
      ok: true,
      nextStatus: "submitted",
    });
  });

  it("downgrades a classified legacy verified company to unverified", () => {
    expect(resolveProfileUpdateStatus("verified", roleDiff, 0)).toEqual({
      ok: true,
      nextStatus: "unverified",
    });
  });
});

describe("profile update invalidation", () => {
  const legalDiff = diffIdentityValues(BASE_IDENTITY, {
    ...BASE_IDENTITY,
    country: "BE",
  });
  const roleDiff = diffIdentityValues(BASE_IDENTITY, {
    ...BASE_IDENTITY,
    companyType: "recruitment_agency",
  });
  const noDiff = diffIdentityValues(BASE_IDENTITY, { ...BASE_IDENTITY });

  it.each([
    ["verified", "unverified"],
    ["direct_employer_checked", "unverified"],
    ["identity_checked", "unverified"],
    ["submitted", "unverified"],
    ["unverified", "unverified"],
  ])("removes all checks for %s after a legal identity change", (current, expected) => {
    expect(resolveProfileUpdateStatus(current, legalDiff, 1)).toEqual({
      ok: true,
      nextStatus: expected,
    });
  });

  it.each([
    ["verified", "identity_checked"],
    ["direct_employer_checked", "identity_checked"],
    ["identity_checked", "identity_checked"],
    ["submitted", "submitted"],
    ["unverified", "unverified"],
  ])("keeps identity but removes the role check for %s", (current, expected) => {
    expect(resolveProfileUpdateStatus(current, roleDiff, 1)).toEqual({
      ok: true,
      nextStatus: expected,
    });
  });

  it("leaves the status untouched for operational-only changes", () => {
    expect(resolveProfileUpdateStatus("verified", noDiff, 1)).toEqual({
      ok: true,
      nextStatus: "verified",
    });
  });

  it("blocks edits to a suspended company", () => {
    expect(resolveProfileUpdateStatus("suspended", legalDiff, 1).ok).toBe(false);
  });

  it("allows non-identity edits on a suspended company without changing status", () => {
    expect(resolveProfileUpdateStatus("suspended", noDiff, 1)).toEqual({
      ok: true,
      nextStatus: "suspended",
    });
  });
});

describe("identity snapshots", () => {
  it("hashes deterministically regardless of key insertion order", () => {
    const reordered = {
      recruitsDirectly: BASE_IDENTITY.recruitsDirectly,
      companyType: BASE_IDENTITY.companyType,
      contractingEntity: BASE_IDENTITY.contractingEntity,
      registeredAddress: BASE_IDENTITY.registeredAddress,
      registrationNumber: BASE_IDENTITY.registrationNumber,
      country: BASE_IDENTITY.country,
      tradingName: BASE_IDENTITY.tradingName,
      legalName: BASE_IDENTITY.legalName,
    } satisfies IdentityValues;
    expect(identityHash(reordered)).toBe(identityHash(BASE_IDENTITY));
  });

  it("changes the hash when an identity field changes", () => {
    expect(identityHash({ ...BASE_IDENTITY, registrationNumber: "99999999" })).not.toBe(
      identityHash(BASE_IDENTITY),
    );
  });

  it("reads a stored snapshot and rejects malformed data", () => {
    const snapshot = buildIdentitySnapshot({
      legalName: "Demo Transport B.V.",
      tradingName: null,
      country: "nl",
      registrationNumber: null,
      registeredAddress: null,
      contractingEntity: null,
      companyType: "direct_employer",
      recruitsDirectly: true,
    });
    expect(snapshot.tradingName).toBe("Demo Transport B.V.");
    expect(snapshot.country).toBe("NL");
    expect(snapshot.contractingEntity).toBe("Demo Transport B.V.");
    expect(readIdentitySnapshot(snapshot)).toEqual(snapshot);
    expect(readIdentitySnapshot({ legalName: "" })).toBeNull();
    expect(readIdentitySnapshot(null)).toBeNull();
  });
});

describe("presentation and vacancy consistency", () => {
  it("labels direct-employer and intermediary role checks differently", () => {
    expect(getVerificationPresentation("direct_employer_checked", "direct_employer", 1).label).toBe(
      "Direct-employer status checked",
    );
    expect(getVerificationPresentation("direct_employer_checked", "recruitment_agency", 1).label).toBe(
      "Intermediary status checked",
    );
  });

  it("distinguishes direct_employer_checked from verified for every company type", () => {
    for (const type of ["direct_employer", "recruitment_agency", "subcontractor"]) {
      const role = getVerificationPresentation("direct_employer_checked", type, 1);
      const full = getVerificationPresentation("verified", type, 1);
      expect(role.stage).toBe("role");
      expect(full.stage).toBe("full");
      expect(role.label).not.toBe(full.label);
      expect(isFullyVerified("direct_employer_checked", 1)).toBe(false);
      expect(isFullyVerified("verified", 1)).toBe(true);
    }
  });

  it("downgrades and promotes vacancy labels with the company badge", () => {
    expect(vacancyStatusForCompanyVerification("published_verified", "unverified", 0)).toBe(
      "published_unverified",
    );
    expect(vacancyStatusForCompanyVerification("published_verified", "identity_checked", 1)).toBe(
      "published_unverified",
    );
    expect(vacancyStatusForCompanyVerification("published_unverified", "verified", 1)).toBe(
      "published_verified",
    );
    expect(vacancyStatusForCompanyVerification("confirmed", "verified", 1)).toBeNull();
    expect(vacancyStatusForCompanyVerification("confirmed", "unverified", 0)).toBeNull();
    expect(vacancyStatusForCompanyVerification("published_verified", "verified", 1)).toBeNull();
  });
});
