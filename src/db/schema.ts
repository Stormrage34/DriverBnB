import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const userRoleEnum = pgEnum("user_role", ["driver", "employer", "admin"]);

export const userTokenPurposeEnum = pgEnum("user_token_purpose", [
  "email_verification",
  "password_reset",
]);

export const companyTypeEnum = pgEnum("company_type", [
  "direct_employer",
  "recruitment_agency",
  "subcontractor",
  "intermediary",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "unverified",
  "submitted",
  "identity_checked",
  "direct_employer_checked",
  "verified",
  "suspended",
]);

export const vacancyStatusEnum = pgEnum("vacancy_status", [
  "draft",
  "published_unverified",
  "published_verified",
  "confirmed",
  "reconfirmation_required",
  "expired",
  "suspended",
]);

export const transportCategoryEnum = pgEnum("transport_category", [
  "reefer",
  "adr_tanker",
  "adr_tank_container",
  "container",
  "box_general",
  "regional",
  "other",
]);

export const contractTypeEnum = pgEnum("contract_type", [
  "permanent",
  "fixed_term",
  "temporary_agency",
  "subcontract",
  "freelance",
]);

export const payPeriodEnum = pgEnum("pay_period", ["month", "week", "hour"]);

export const accommodationEnum = pgEnum("accommodation_arrangement", [
  "provided_free",
  "provided_deducted",
  "optional",
  "not_provided",
  "not_disclosed",
]);

export const loadingDutyEnum = pgEnum("loading_duty", ["none", "occasional", "full"]);

export const applicationMethodEnum = pgEnum("application_method", [
  "external_link",
  "email",
  "platform_message",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "published",
  "under_review",
  "rejected",
  "removed",
]);

export const enquiryStatusEnum = pgEnum("enquiry_status", [
  "sent",
  "viewed",
  "responded",
  "closed",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "open",
  "investigating",
  "resolved",
  "dismissed",
]);

export const reportTargetEnum = pgEnum("report_target", [
  "review",
  "vacancy",
  "company",
  "message",
]);

export const moderationDecisionEnum = pgEnum("moderation_decision", [
  "approved",
  "rejected",
  "needs_information",
]);

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "basic",
  "vacancy",
  "business",
  "multi_vacancy",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "cancelled",
  "trialing",
]);

/* ------------------------------------------------------------------ */
/* Shared column helpers                                               */
/* ------------------------------------------------------------------ */

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("driver"),
    displayName: text("display_name").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    suspendedReason: text("suspended_reason"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt,
  },
  (t) => [
    uniqueIndex("sessions_token_hash_unique").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
  ],
);

/**
 * Single-use, hashed account tokens. A token is never stored in plaintext and
 * never enters audit metadata or admin reads.
 */
export const userTokens = pgTable(
  "user_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: userTokenPurposeEnum("purpose").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt,
  },
  (t) => [
    uniqueIndex("user_tokens_token_hash_unique").on(t.tokenHash),
    index("user_tokens_user_purpose_idx").on(t.userId, t.purpose),
    uniqueIndex("user_tokens_one_unconsumed_per_purpose")
      .on(t.userId, t.purpose)
      .where(sql`${t.consumedAt} is null`),
  ],
);

export const driverProfiles = pgTable(
  "driver_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    firstName: text("first_name"),
    countryOfResidence: text("country_of_residence"),
    languages: text("languages").array().notNull().default([]),
    licenceCategories: text("licence_categories").array().notNull().default([]),
    code95: boolean("code_95").notNull().default(false),
    adrQualified: boolean("adr_qualified").notNull().default(false),
    adrClasses: text("adr_classes").array().notNull().default([]),
    yearsExperience: integer("years_experience"),
    transportExperience: text("transport_experience"),
    preferredCategories: text("preferred_categories").array().notNull().default([]),
    preferredCountries: text("preferred_countries").array().notNull().default([]),
    preferredRotation: text("preferred_rotation"),
    availability: text("availability"),
    cvObjectKey: text("cv_object_key"),
    cvFileName: text("cv_file_name"),
    phone: text("phone"),
    contactEmail: text("contact_email"),
    /** private | employers_on_request — never public by default */
    profileVisibility: text("profile_visibility").notNull().default("private"),
    /** discoverable by employers: false by default, opt-in only */
    isSearchable: boolean("is_searchable").notNull().default(false),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex("driver_profiles_user_unique").on(t.userId)],
);

/* ------------------------------------------------------------------ */
/* Companies                                                           */
/* ------------------------------------------------------------------ */

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    legalName: text("legal_name").notNull(),
    tradingName: text("trading_name"),
    country: text("country").notNull(),
    registrationNumber: text("registration_number"),
    registeredAddress: text("registered_address"),
    website: text("website"),
    businessEmail: text("business_email"),
    phone: text("phone"),
    contactPerson: text("contact_person"),
    sectors: text("sectors").array().notNull().default([]),
    fleetSize: integer("fleet_size"),
    operatesOwnFleet: boolean("operates_own_fleet").notNull().default(false),
    recruitsDirectly: boolean("recruits_directly").notNull().default(false),
    companyType: companyTypeEnum("company_type").notNull(),
    contractingEntity: text("contracting_entity"),
    description: text("description"),
    verificationStatus: verificationStatusEnum("verification_status").notNull().default("unverified"),
    verificationVersion: integer("verification_version").notNull().default(0),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    verificationNotes: text("verification_notes"),
    isDemoSeed: boolean("is_demo_seed").notNull().default(false),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspensionReason: text("suspension_reason"),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("companies_slug_unique").on(t.slug),
    index("companies_country_idx").on(t.country),
    index("companies_verification_idx").on(t.verificationStatus),
  ],
);

export const companyVerifications = pgTable(
  "company_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    submittedByUserId: uuid("submitted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    submittedData: jsonb("submitted_data").$type<Record<string, unknown>>().notNull().default({}),
    evidenceNotes: text("evidence_notes"),
    status: verificationStatusEnum("status").notNull().default("submitted"),
    decision: moderationDecisionEnum("decision"),
    reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    decisionNotes: text("decision_notes"),
    createdAt,
  },
  (t) => [index("company_verifications_company_idx").on(t.companyId)],
);

export const companySubscriptions = pgTable(
  "company_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    plan: subscriptionPlanEnum("plan").notNull().default("basic"),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [index("company_subscriptions_company_idx").on(t.companyId)],
);

/* ------------------------------------------------------------------ */
/* Vacancies                                                           */
/* ------------------------------------------------------------------ */

export type Allowance = {
  label: string;
  amount: number | null;
  currency: string;
  note?: string;
};

export const vacancies = pgTable(
  "vacancies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    country: text("country").notNull(),
    city: text("city"),
    contractingEntity: text("contracting_entity").notNull(),
    transportCategory: transportCategoryEnum("transport_category").notNull(),
    licenceRequirements: text("licence_requirements").array().notNull().default([]),
    experienceRequirements: text("experience_requirements"),
    contractType: contractTypeEnum("contract_type").notNull().default("permanent"),
    grossPayMin: integer("gross_pay_min"),
    grossPayMax: integer("gross_pay_max"),
    currency: text("currency").notNull().default("EUR"),
    payPeriod: payPeriodEnum("pay_period").notNull().default("month"),
    payStructure: text("pay_structure"),
    allowances: jsonb("allowances").$type<Allowance[]>().notNull().default([]),
    workingPattern: text("working_pattern"),
    rotation: text("rotation"),
    homeTime: text("home_time"),
    loadingUnloading: loadingDutyEnum("loading_unloading").notNull().default("none"),
    accommodation: accommodationEnum("accommodation").notNull().default("not_disclosed"),
    accommodationDetails: text("accommodation_details"),
    weeklyRest: text("weekly_rest"),
    vehicleType: text("vehicle_type"),
    equipment: text("equipment"),
    operatingCountries: text("operating_countries").array().notNull().default([]),
    languagesRequired: text("languages_required").array().notNull().default([]),
    trainingProvided: text("training_provided"),
    benefits: text("benefits"),
    applicationMethod: applicationMethodEnum("application_method").notNull().default("platform_message"),
    applicationUrl: text("application_url"),
    applicationEmail: text("application_email"),
    contactName: text("contact_name"),
    status: vacancyStatusEnum("status").notNull().default("draft"),
    suspendedFromStatus: vacancyStatusEnum("suspended_from_status"),
    infoScore: integer("info_score").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
    reconfirmDueAt: timestamp("reconfirm_due_at", { withTimezone: true }),
    viewCount: integer("view_count").notNull().default(0),
    moderationNote: text("moderation_note"),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("vacancies_slug_unique").on(t.slug),
    index("vacancies_company_idx").on(t.companyId),
    index("vacancies_status_idx").on(t.status),
    index("vacancies_country_idx").on(t.country),
    index("vacancies_category_idx").on(t.transportCategory),
  ],
);

export const vacancyReconfirmations = pgTable(
  "vacancy_reconfirmations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vacancyId: uuid("vacancy_id")
      .notNull()
      .references(() => vacancies.id, { onDelete: "cascade" }),
    confirmedByUserId: uuid("confirmed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt,
  },
  (t) => [index("vacancy_reconfirmations_vacancy_idx").on(t.vacancyId)],
);

/* ------------------------------------------------------------------ */
/* Reviews and reputation                                              */
/* ------------------------------------------------------------------ */

export const driverReviews = pgTable(
  "driver_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    driverUserId: uuid("driver_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobTitle: text("job_title"),
    employmentStart: date("employment_start"),
    employmentEnd: date("employment_end"),
    overallRating: integer("overall_rating").notNull(),
    paymentReliability: integer("payment_reliability"),
    advertAccuracy: integer("advert_accuracy"),
    dispatchManagement: integer("dispatch_management"),
    equipment: integer("equipment"),
    homeTime: integer("home_time"),
    accommodation: integer("accommodation"),
    deductions: integer("deductions"),
    workingConditions: integer("working_conditions"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: reviewStatusEnum("status").notNull().default("pending"),
    eligibilityAttested: boolean("eligibility_attested").notNull().default(false),
    moderationNotes: text("moderation_notes"),
    moderatedByUserId: uuid("moderated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("driver_reviews_one_per_experience").on(
      t.companyId,
      t.driverUserId,
      t.employmentStart,
    ),
    index("driver_reviews_company_idx").on(t.companyId),
    index("driver_reviews_status_idx").on(t.status),
  ],
);

export const reviewResponses = pgTable(
  "review_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => driverReviews.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    status: text("status").notNull().default("published"),
    createdAt,
    updatedAt,
  },
  (t) => [index("review_responses_review_idx").on(t.reviewId)],
);

/* ------------------------------------------------------------------ */
/* Enquiries, saved items                                              */
/* ------------------------------------------------------------------ */

export const enquiries = pgTable(
  "enquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vacancyId: uuid("vacancy_id").references(() => vacancies.id, { onDelete: "set null" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    driverUserId: uuid("driver_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    method: applicationMethodEnum("method").notNull().default("platform_message"),
    message: text("message").notNull(),
    sharedEmail: text("shared_email"),
    sharedPhone: text("shared_phone"),
    status: enquiryStatusEnum("status").notNull().default("sent"),
    employerViewedAt: timestamp("employer_viewed_at", { withTimezone: true }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("enquiries_driver_idx").on(t.driverUserId),
    index("enquiries_company_idx").on(t.companyId),
  ],
);

export const savedVacancies = pgTable(
  "saved_vacancies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vacancyId: uuid("vacancy_id")
      .notNull()
      .references(() => vacancies.id, { onDelete: "cascade" }),
    createdAt,
  },
  (t) => [uniqueIndex("saved_vacancies_unique").on(t.userId, t.vacancyId)],
);

export const savedCompanies = pgTable(
  "saved_companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdAt,
  },
  (t) => [uniqueIndex("saved_companies_unique").on(t.userId, t.companyId)],
);

/* ------------------------------------------------------------------ */
/* Moderation and audit                                                */
/* ------------------------------------------------------------------ */

export const contentReports = pgTable(
  "content_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterUserId: uuid("reporter_user_id").references(() => users.id, { onDelete: "set null" }),
    targetType: reportTargetEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details"),
    status: reportStatusEnum("status").notNull().default("open"),
    resolutionNotes: text("resolution_notes"),
    handledByUserId: uuid("handled_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    handledAt: timestamp("handled_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [index("content_reports_status_idx").on(t.status)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ipAddress: text("ip_address"),
    createdAt,
  },
  (t) => [index("audit_logs_actor_idx").on(t.actorUserId), index("audit_logs_created_idx").on(t.createdAt)],
);

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  handledAt: timestamp("handled_at", { withTimezone: true }),
  createdAt,
});

/* ------------------------------------------------------------------ */
/* Phase 2/3 schema scaffolding (not exposed in MVP 1 UI)              */
/* ------------------------------------------------------------------ */

export const businessProfiles = pgTable("business_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  vehicleCount: integer("vehicle_count"),
  trailerTypes: text("trailer_types").array().notNull().default([]),
  transportCategories: text("transport_categories").array().notNull().default([]),
  adrCapability: boolean("adr_capability").notNull().default(false),
  coverageCountries: text("coverage_countries").array().notNull().default([]),
  languages: text("languages").array().notNull().default([]),
  insuranceInfo: text("insurance_info"),
  availability: text("availability"),
  preferredArrangements: text("preferred_arrangements"),
  createdAt,
  updatedAt,
});

export const serviceListings = pgTable("service_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  serviceType: text("service_type").notNull(),
  description: text("description"),
  locationCountry: text("location_country"),
  locationCity: text("location_city"),
  contactMethod: text("contact_method"),
  createdAt,
  updatedAt,
});

export const commercialOpportunities = pgTable("commercial_opportunities", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  opportunityType: text("opportunity_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  originCountry: text("origin_country"),
  destinationCountry: text("destination_country"),
  vehicleRequirements: text("vehicle_requirements"),
  cargoType: text("cargo_type"),
  requiredLicences: text("required_licences").array().notNull().default([]),
  startDate: date("start_date"),
  duration: text("duration"),
  paymentTerms: text("payment_terms"),
  contractingParty: text("contracting_party"),
  contactMethod: text("contact_method"),
  lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
  status: text("status").notNull().default("draft"),
  createdAt,
  updatedAt,
});

export type User = typeof users.$inferSelect;
export type DriverProfile = typeof driverProfiles.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Vacancy = typeof vacancies.$inferSelect;
export type DriverReview = typeof driverReviews.$inferSelect;
export type ReviewResponse = typeof reviewResponses.$inferSelect;
export type Enquiry = typeof enquiries.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
