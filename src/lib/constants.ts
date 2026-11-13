export const COUNTRIES = [
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "DK", name: "Denmark" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "FI", name: "Finland" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czechia" },
  { code: "SK", name: "Slovakia" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
  { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" },
  { code: "IT", name: "Italy" },
  { code: "LT", name: "Lithuania" },
  { code: "LV", name: "Latvia" },
  { code: "EE", name: "Estonia" },
  { code: "RO", name: "Romania" },
  { code: "BG", name: "Bulgaria" },
  { code: "HU", name: "Hungary" },
  { code: "SI", name: "Slovenia" },
  { code: "HR", name: "Croatia" },
  { code: "IE", name: "Ireland" },
  { code: "LU", name: "Luxembourg" },
] as const;

export function countryName(code: string | null | undefined): string {
  if (!code) return "—";
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

export const TRANSPORT_CATEGORIES = [
  { value: "reefer", label: "Refrigerated / reefer" },
  { value: "adr_tanker", label: "ADR tanker" },
  { value: "adr_tank_container", label: "ADR tank-container" },
  { value: "container", label: "Sea container" },
  { value: "box_general", label: "Box / general freight" },
  { value: "regional", label: "Regional / national" },
  { value: "other", label: "Other" },
] as const;

export type TransportCategory = (typeof TRANSPORT_CATEGORIES)[number]["value"];

export function categoryLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return TRANSPORT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export const COMPANY_TYPES = [
  { value: "direct_employer", label: "Direct transport employer" },
  { value: "recruitment_agency", label: "Recruitment agency" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "intermediary", label: "Intermediary" },
] as const;

export function companyTypeLabel(value: string): string {
  return COMPANY_TYPES.find((t) => t.value === value)?.label ?? value;
}

export const VACANCY_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published_unverified", label: "Published — employer not verified" },
  { value: "published_verified", label: "Published — employer verified" },
  { value: "confirmed", label: "Vacancy confirmed" },
  { value: "reconfirmation_required", label: "Reconfirmation required" },
  { value: "expired", label: "Expired" },
  { value: "suspended", label: "Suspended" },
] as const;

export function vacancyStatusLabel(value: string, companyTrusted = true): string {
  if (value === "published_verified" && !companyTrusted) {
    return "Published — employer verification requires review";
  }
  return VACANCY_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export const CONTRACT_TYPES = [
  { value: "permanent", label: "Permanent contract" },
  { value: "fixed_term", label: "Fixed-term contract" },
  { value: "temporary_agency", label: "Agency contract" },
  { value: "subcontract", label: "Subcontract" },
  { value: "freelance", label: "Freelance / self-employed" },
] as const;

export function contractTypeLabel(value: string): string {
  return CONTRACT_TYPES.find((c) => c.value === value)?.label ?? value;
}

export const PAY_PERIODS = [
  { value: "month", label: "per month" },
  { value: "week", label: "per week" },
  { value: "hour", label: "per hour" },
] as const;

export function payPeriodLabel(value: string): string {
  return PAY_PERIODS.find((p) => p.value === value)?.label ?? value;
}

export const ACCOMMODATION_OPTIONS = [
  { value: "provided_free", label: "Provided, free of charge" },
  { value: "provided_deducted", label: "Provided, deducted from pay" },
  { value: "optional", label: "Optional arrangement" },
  { value: "not_provided", label: "Not provided" },
  { value: "not_disclosed", label: "Not disclosed" },
] as const;

export function accommodationLabel(value: string): string {
  return ACCOMMODATION_OPTIONS.find((a) => a.value === value)?.label ?? value;
}

export const LOADING_OPTIONS = [
  { value: "none", label: "No loading / unloading" },
  { value: "occasional", label: "Occasional loading / unloading" },
  { value: "full", label: "Regular loading / unloading" },
] as const;

export function loadingLabel(value: string): string {
  return LOADING_OPTIONS.find((l) => l.value === value)?.label ?? value;
}

export const APPLICATION_METHODS = [
  { value: "external_link", label: "Employer application page" },
  { value: "email", label: "Employer recruitment email" },
  { value: "platform_message", label: "Direct enquiry via DriverCompass" },
] as const;

export function applicationMethodLabel(value: string): string {
  return APPLICATION_METHODS.find((a) => a.value === value)?.label ?? value;
}

export const REVIEW_CATEGORIES = [
  { key: "paymentReliability", label: "Payment reliability", question: "Was salary paid on time and in full?" },
  { key: "advertAccuracy", label: "Advertisement accuracy", question: "Did actual conditions match the vacancy?" },
  { key: "dispatchManagement", label: "Dispatch & management", question: "Was communication professional?" },
  { key: "equipment", label: "Equipment", question: "Was the truck maintained properly?" },
  { key: "homeTime", label: "Home time", question: "Were agreed rotations respected?" },
  { key: "accommodation", label: "Accommodation", question: "Were rest arrangements suitable?" },
  { key: "deductions", label: "Deductions", question: "Were deductions explained and justified?" },
  { key: "workingConditions", label: "Working conditions", question: "Were drivers treated fairly?" },
] as const;

export type ReviewCategoryKey = (typeof REVIEW_CATEGORIES)[number]["key"];

export const SUBSCRIPTION_PLANS = [
  {
    value: "basic",
    name: "Basic",
    price: "Free",
    priceNote: "Company profile only",
    features: ["Verified company identity (when approved)", "Public company profile", "No vacancy slots"],
  },
  {
    value: "vacancy",
    name: "Vacancy",
    price: "€19–29 / month",
    priceNote: "Hypothesis — to be validated",
    features: ["One active vacancy", "Structured working-condition fields", "Direct enquiries"],
  },
  {
    value: "business",
    name: "Business",
    price: "€39–59 / month",
    priceNote: "Hypothesis — to be validated",
    features: ["Enhanced profile", "Three active vacancies", "Vacancy statistics", "Review responses"],
  },
  {
    value: "multi_vacancy",
    name: "Multi-vacancy",
    price: "€79–149 / month",
    priceNote: "Hypothesis — to be validated",
    features: ["Up to ten active vacancies", "Recruitment tools", "Priority support"],
  },
] as const;

export const REPORT_REASONS = [
  "Misleading vacancy",
  "Fake or impersonated company",
  "Abusive or defamatory review",
  "Personal data published",
  "Spam or duplicate listing",
  "Other",
] as const;

/** Number of days before a vacancy needs employer reconfirmation. */
export const RECONFIRM_AFTER_DAYS = 30;

/**
 * Days a vacancy may remain public and flagged as `reconfirmation_required`
 * after its reconfirmation due date before the lifecycle job expires it.
 */
export const RECONFIRM_GRACE_DAYS = 7;
