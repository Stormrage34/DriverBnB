import type { Company } from "@/db/schema";

/* ------------------------------------------------------------------ */
/* Status model                                                        */
/* ------------------------------------------------------------------ */

export const VERIFICATION_STATUS_VALUES = [
  "unverified",
  "submitted",
  "identity_checked",
  "direct_employer_checked",
  "verified",
  "suspended",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUS_VALUES)[number];

export const FULLY_VERIFIED_STATUS = "verified" satisfies VerificationStatus;

const RANK: Record<string, number> = {
  suspended: -1,
  unverified: 0,
  submitted: 1,
  identity_checked: 2,
  direct_employer_checked: 3,
  verified: 4,
};

export function verificationRank(status: string): number {
  return RANK[status] ?? 0;
}

export const TRUSTED_VERIFICATION_VERSION = 1;

export function hasTrustedVerification(version: number | null | undefined): boolean {
  return (version ?? 0) >= TRUSTED_VERIFICATION_VERSION;
}

export function identityChecked(status: string, version = 0): boolean {
  return hasTrustedVerification(version) && verificationRank(status) >= 2;
}

export function roleChecked(status: string, version = 0): boolean {
  return hasTrustedVerification(version) && verificationRank(status) >= 3;
}

export function isFullyVerified(status: string, version = 0): boolean {
  return hasTrustedVerification(version) && status === FULLY_VERIFIED_STATUS;
}

export function isDirectEmployerType(companyType: string): boolean {
  return companyType === "direct_employer";
}

export function roleCheckLabel(companyType: string): string {
  return isDirectEmployerType(companyType)
    ? "Direct-employer status checked"
    : "Intermediary status checked";
}

export type VerificationTone = "neutral" | "success" | "warning" | "danger" | "info";
export type VerificationStage = "none" | "submitted" | "identity" | "role" | "full" | "suspended";

export type VerificationPresentation = {
  label: string;
  tone: VerificationTone;
  stage: VerificationStage;
};

export function getVerificationPresentation(
  status: string,
  companyType: string,
  version = 0,
): VerificationPresentation {
  if (status === "verified" && !hasTrustedVerification(version)) {
    return {
      label: "Verification requires review",
      tone: "warning",
      stage: "none",
    };
  }
  switch (status) {
    case "submitted":
      return { label: "Verification submitted", tone: "warning", stage: "submitted" };
    case "identity_checked":
      return { label: "Identity checked", tone: "info", stage: "identity" };
    case "direct_employer_checked":
      return {
        label: roleCheckLabel(companyType),
        tone: "info",
        stage: "role",
      };
    case "verified":
      return {
        label: isDirectEmployerType(companyType) ? "Verified employer" : "Verified company",
        tone: "success",
        stage: "full",
      };
    case "suspended":
      return { label: "Suspended", tone: "danger", stage: "suspended" };
    default:
      return { label: "Unverified", tone: "neutral", stage: "none" };
  }
}

export function verificationLabel(
  status: string,
  companyType = "direct_employer",
  version = 0,
): string {
  return getVerificationPresentation(status, companyType, version).label;
}

export function verificationTone(status: string, version = 0): VerificationTone {
  return getVerificationPresentation(status, "direct_employer", version).tone;
}

/* ------------------------------------------------------------------ */
/* Verified identity fields                                            */
/* ------------------------------------------------------------------ */

export const LEGAL_IDENTITY_FIELDS = [
  "legalName",
  "tradingName",
  "country",
  "registrationNumber",
  "registeredAddress",
  "contractingEntity",
] as const;

export const CLASSIFICATION_FIELDS = ["companyType", "recruitsDirectly"] as const;

export const OPERATIONAL_FIELDS = [
  "operatesOwnFleet",
  "fleetSize",
  "sectors",
  "website",
  "businessEmail",
  "phone",
  "contactPerson",
  "description",
] as const;

export type LegalIdentityField = (typeof LEGAL_IDENTITY_FIELDS)[number];
export type ClassificationField = (typeof CLASSIFICATION_FIELDS)[number];
export type OperationalField = (typeof OPERATIONAL_FIELDS)[number];
export type ChangeCategory = "legal_identity" | "classification" | "operational";

export const CHANGE_FIELD_LABELS: Record<string, string> = {
  legalName: "Registered legal name",
  tradingName: "Trading name",
  country: "Country of registration",
  registrationNumber: "Registration number",
  registeredAddress: "Registered address",
  contractingEntity: "Contracting legal entity",
  companyType: "Employer classification",
  recruitsDirectly: "Direct recruitment declaration",
  operatesOwnFleet: "Operates own fleet",
  fleetSize: "Fleet size",
  sectors: "Sectors",
  website: "Website",
  businessEmail: "Business email",
  phone: "Phone",
  contactPerson: "Contact person",
  description: "Description",
};

export function changeFieldLabel(field: string): string {
  return CHANGE_FIELD_LABELS[field] ?? field;
}

export type FieldChange = {
  field: string;
  label: string;
  previous: string | boolean | number | string[] | null;
  current: string | boolean | number | string[] | null;
  category: ChangeCategory;
};

export type IdentityValues = {
  legalName: string;
  tradingName: string;
  country: string;
  registrationNumber: string | null;
  registeredAddress: string | null;
  contractingEntity: string | null;
  companyType: string;
  recruitsDirectly: boolean;
};

export type IdentitySnapshot = IdentityValues;

export type IdentityDiff = {
  legalIdentityChanged: boolean;
  classificationChanged: boolean;
  changes: FieldChange[];
  hasChanges: boolean;
};

export type OperationalValues = {
  operatesOwnFleet: boolean;
  fleetSize: number | null;
  sectors: string[];
  website: string | null;
  businessEmail: string | null;
  phone: string | null;
  contactPerson: string | null;
  description: string | null;
};

export type OperationalDiff = {
  changed: boolean;
  material: boolean;
  changes: FieldChange[];
};

const MATERIAL_OPERATIONAL_FIELDS = new Set<string>([
  "operatesOwnFleet",
  "fleetSize",
  "sectors",
  "website",
]);

type CompanyIdentitySource = Pick<
  Company,
  | "legalName"
  | "tradingName"
  | "country"
  | "registrationNumber"
  | "registeredAddress"
  | "contractingEntity"
  | "companyType"
  | "recruitsDirectly"
>;

type CompanyOperationalSource = Pick<
  Company,
  | "operatesOwnFleet"
  | "fleetSize"
  | "sectors"
  | "website"
  | "businessEmail"
  | "phone"
  | "contactPerson"
  | "description"
>;

function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function publicTradingName(name: string | null | undefined, legalName: string): string {
  return cleanText(name) ?? cleanText(legalName) ?? "";
}

export function buildIdentitySnapshot(source: CompanyIdentitySource): IdentitySnapshot {
  return {
    legalName: cleanText(source.legalName) ?? "",
    tradingName: publicTradingName(source.tradingName, source.legalName),
    country: (cleanText(source.country) ?? "").toUpperCase(),
    registrationNumber: cleanText(source.registrationNumber),
    registeredAddress: cleanText(source.registeredAddress),
    contractingEntity:
      cleanText(source.contractingEntity) ?? cleanText(source.legalName),
    companyType: source.companyType,
    recruitsDirectly: Boolean(source.recruitsDirectly),
  };
}

export function buildOperationalValues(source: CompanyOperationalSource): OperationalValues {
  return {
    operatesOwnFleet: Boolean(source.operatesOwnFleet),
    fleetSize: source.fleetSize ?? null,
    sectors: [...(source.sectors ?? [])],
    website: cleanText(source.website),
    businessEmail: cleanText(source.businessEmail),
    phone: cleanText(source.phone),
    contactPerson: cleanText(source.contactPerson),
    description: cleanText(source.description),
  };
}

export function readIdentitySnapshot(value: unknown): IdentitySnapshot | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.legalName !== "string" || data.legalName.trim() === "") return null;
  if (typeof data.country !== "string") return null;
  if (typeof data.companyType !== "string") return null;
  return {
    legalName: data.legalName.trim(),
    tradingName:
      typeof data.tradingName === "string" && data.tradingName.trim()
        ? data.tradingName.trim()
        : data.legalName.trim(),
    country: data.country.trim().toUpperCase(),
    registrationNumber:
      typeof data.registrationNumber === "string" ? data.registrationNumber.trim() : null,
    registeredAddress:
      typeof data.registeredAddress === "string" ? data.registeredAddress.trim() : null,
    contractingEntity:
      typeof data.contractingEntity === "string" && data.contractingEntity.trim()
        ? data.contractingEntity.trim()
        : data.legalName.trim(),
    companyType: data.companyType,
    recruitsDirectly: data.recruitsDirectly === true,
  };
}

function valuesEqual(
  previous: string | boolean | number | string[] | null,
  current: string | boolean | number | string[] | null,
): boolean {
  if (Array.isArray(previous) || Array.isArray(current)) {
    if (!Array.isArray(previous) || !Array.isArray(current)) return false;
    if (previous.length !== current.length) return false;
    return previous.every((item, index) => item === current[index]);
  }
  return previous === current;
}

export function diffIdentityValues(
  previous: IdentityValues,
  current: IdentityValues,
): IdentityDiff {
  const changes: FieldChange[] = [];

  for (const field of LEGAL_IDENTITY_FIELDS) {
    if (!valuesEqual(previous[field], current[field])) {
      changes.push({
        field,
        label: changeFieldLabel(field),
        previous: previous[field],
        current: current[field],
        category: "legal_identity",
      });
    }
  }
  for (const field of CLASSIFICATION_FIELDS) {
    if (!valuesEqual(previous[field], current[field])) {
      changes.push({
        field,
        label: changeFieldLabel(field),
        previous: previous[field],
        current: current[field],
        category: "classification",
      });
    }
  }

  const legalIdentityChanged = changes.some((change) => change.category === "legal_identity");
  const classificationChanged = changes.some((change) => change.category === "classification");

  return {
    legalIdentityChanged,
    classificationChanged,
    changes,
    hasChanges: changes.length > 0,
  };
}

export function diffOperationalValues(
  previous: OperationalValues,
  current: OperationalValues,
): OperationalDiff {
  const changes: FieldChange[] = [];

  for (const field of OPERATIONAL_FIELDS) {
    if (!valuesEqual(previous[field], current[field])) {
      changes.push({
        field,
        label: changeFieldLabel(field),
        previous: previous[field],
        current: current[field],
        category: "operational",
      });
    }
  }

  return {
    changed: changes.length > 0,
    material: changes.some((change) => MATERIAL_OPERATIONAL_FIELDS.has(change.field)),
    changes,
  };
}

export function requiresIdentityConfirmation(status: string, diff: IdentityDiff): boolean {
  return status !== "unverified" && diff.hasChanges;
}

export type StatusResolution =
  | { ok: true; nextStatus: VerificationStatus }
  | { ok: false; error: string };

/**
 * Status after an employer edits the company profile.
 * Legal identity changes remove both checks; classification changes remove only the role check.
 */
export function resolveProfileUpdateStatus(
  currentStatus: string,
  diff: IdentityDiff,
  verificationVersion = 0,
): StatusResolution {
  if (currentStatus === "suspended") {
    if (diff.hasChanges) {
      return { ok: false, error: "This company is suspended. Contact support to change its details." };
    }
    return { ok: true, nextStatus: "suspended" };
  }
  if (!diff.hasChanges) return { ok: true, nextStatus: currentStatus as VerificationStatus };
  if (diff.legalIdentityChanged) return { ok: true, nextStatus: "unverified" };
  if (diff.classificationChanged) {
    if (identityChecked(currentStatus, verificationVersion)) {
      return { ok: true, nextStatus: "identity_checked" };
    }
    return {
      ok: true,
      nextStatus: (currentStatus === "submitted" ? "submitted" : "unverified") as VerificationStatus,
    };
  }
  return { ok: true, nextStatus: currentStatus as VerificationStatus };
}

/**
 * Status after an employer submits or resubmits verification evidence.
 * Ordinary resubmission preserves completed checks. Legal identity changes reset the
 * checks; classification changes preserve identity but invalidate the role check.
 * A legacy `verified` company without a trusted snapshot must be reviewed again.
 */
export function resolveSubmissionStatus(
  currentStatus: string,
  diff: IdentityDiff,
  verificationVersion = 0,
): StatusResolution {
  if (currentStatus === "suspended") {
    return { ok: false, error: "This company is suspended and cannot submit verification." };
  }
  if (diff.legalIdentityChanged) return { ok: true, nextStatus: "submitted" };
  if (diff.classificationChanged) {
    return {
      ok: true,
      nextStatus: identityChecked(currentStatus, verificationVersion)
        ? "identity_checked"
        : "submitted",
    };
  }
  if (currentStatus === "unverified") return { ok: true, nextStatus: "submitted" };
  if (currentStatus === "verified" && !hasTrustedVerification(verificationVersion)) {
    return { ok: true, nextStatus: "submitted" };
  }
  return { ok: true, nextStatus: currentStatus as VerificationStatus };
}

/* ------------------------------------------------------------------ */
/* Moderator transitions                                               */
/* ------------------------------------------------------------------ */

export const ALL_VERIFICATION_OUTCOMES = [
  "identity_checked",
  "direct_employer_checked",
  "verified",
  "needs_information",
  "rejected",
] as const;

export type VerificationOutcome = (typeof ALL_VERIFICATION_OUTCOMES)[number];

const NEXT_STAGE: Record<string, VerificationOutcome> = {
  unverified: "identity_checked",
  submitted: "identity_checked",
  identity_checked: "direct_employer_checked",
  direct_employer_checked: "verified",
};

export function allowedVerificationOutcomes(status: string): VerificationOutcome[] {
  if (status === "submitted" || status === "identity_checked" || status === "direct_employer_checked") {
    return [NEXT_STAGE[status], "needs_information", "rejected"];
  }
  return [];
}

export type TransitionDecision = "approved" | "rejected" | "needs_information";

export type VerificationTransition =
  | { ok: true; nextStatus: VerificationStatus; decision: TransitionDecision }
  | { ok: false; error: string };

export function resolveVerificationTransition(input: {
  currentStatus: string;
  outcome: VerificationOutcome;
}): VerificationTransition {
  const { currentStatus, outcome } = input;
  const allowed = allowedVerificationOutcomes(currentStatus);

  if (!allowed.includes(outcome)) {
    return {
      ok: false,
      error: `A company at "${currentStatus}" cannot move to "${outcome}".`,
    };
  }

  if (outcome === "needs_information") {
    return { ok: true, nextStatus: currentStatus as VerificationStatus, decision: "needs_information" };
  }
  if (outcome === "rejected") {
    return { ok: true, nextStatus: "unverified", decision: "rejected" };
  }
  return { ok: true, nextStatus: outcome, decision: "approved" };
}

/* ------------------------------------------------------------------ */
/* Vacancy label consistency                                           */
/* ------------------------------------------------------------------ */

/**
 * The only vacancy status rewrite allowed when a company gains or loses the full badge.
 * Returns null when no change is required.
 */
export function vacancyStatusForCompanyVerification(
  vacancyStatus: string,
  companyStatus: string,
  verificationVersion = 0,
): "published_verified" | "published_unverified" | null {
  if (isFullyVerified(companyStatus, verificationVersion) && vacancyStatus === "published_unverified") {
    return "published_verified";
  }
  if (
    !isFullyVerified(companyStatus, verificationVersion) &&
    vacancyStatus === "published_verified"
  ) {
    return "published_unverified";
  }
  return null;
}

export type VerificationRecordKind =
  | "employer_submission"
  | "system_profile_change"
  | "legacy";

/**
 * Evidence provenance. Rows written before T-002d have no source; they are
 * deliberately classified as legacy, never as employer-submitted evidence.
 */
export function verificationRecordKind(submittedData: unknown): VerificationRecordKind {
  if (!submittedData || typeof submittedData !== "object") return "legacy";
  const source = (submittedData as Record<string, unknown>).source;
  if (source === "company_profile_update") return "system_profile_change";
  if (source === "employer_submission") return "employer_submission";
  return "legacy";
}
