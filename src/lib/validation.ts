import { z } from "zod";
import { REVIEW_CATEGORIES } from "@/lib/constants";

const email = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .email("Enter a valid email address")
  .transform((v) => v.toLowerCase());

const password = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(200, "Password is too long");

const displayName = z.string().trim().min(2, "Enter your name").max(80);

export const registerDriverSchema = z
  .object({
    displayName,
    email,
    password,
    confirmPassword: z.string(),
    country: z.string().trim().max(2).optional().or(z.literal("")),
    acceptTerms: z.literal("on", { message: "You must accept the terms and privacy notice" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const registerEmployerSchema = z
  .object({
    displayName,
    email,
    password,
    confirmPassword: z.string(),
    companyLegalName: z.string().trim().min(2, "Enter the registered company name").max(160),
    companyCountry: z.string().trim().length(2, "Select a country"),
    companyRegistrationNumber: z.string().trim().min(2, "Enter the registration number").max(40),
    companyType: z.enum(["direct_employer", "recruitment_agency", "subcontractor", "intermediary"]),
    companyWebsite: z.string().trim().max(200).optional().or(z.literal("")),
    acceptTerms: z.literal("on", { message: "You must accept the terms and privacy notice" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(200),
});

const accountToken = z.string().trim().min(20, "This link is invalid").max(200);

export const emailVerificationSchema = z.object({
  token: accountToken,
});

export const resendVerificationSchema = z.object({
  email,
});

export const passwordResetRequestSchema = z.object({
  email,
});

export const passwordResetSchema = z
  .object({
    token: accountToken,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const driverProfileSchema = z.object({
  firstName: z.string().trim().max(60).optional().or(z.literal("")),
  countryOfResidence: z.string().trim().max(2).optional().or(z.literal("")),
  languages: z.string().trim().max(200).optional().or(z.literal("")),
  licenceCategories: z.string().trim().max(120).optional().or(z.literal("")),
  code95: z.boolean().optional(),
  adrQualified: z.boolean().optional(),
  adrClasses: z.string().trim().max(120).optional().or(z.literal("")),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
  transportExperience: z.string().trim().max(2000).optional().or(z.literal("")),
  preferredCategories: z.string().trim().max(200).optional().or(z.literal("")),
  preferredCountries: z.string().trim().max(200).optional().or(z.literal("")),
  preferredRotation: z.string().trim().max(200).optional().or(z.literal("")),
  availability: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  contactEmail: email.optional().or(z.literal("")),
});

export const companyProfileSchema = z.object({
  legalName: z.string().trim().min(2, "Enter the legal company name").max(160),
  tradingName: z.string().trim().max(160).optional().or(z.literal("")),
  country: z.string().trim().length(2, "Select a country"),
  registrationNumber: z.string().trim().min(2, "Enter the registration number").max(40),
  registeredAddress: z.string().trim().max(300).optional().or(z.literal("")),
  website: z.string().trim().max(200).optional().or(z.literal("")),
  businessEmail: email.optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  contactPerson: z.string().trim().max(120).optional().or(z.literal("")),
  sectors: z.string().trim().max(300).optional().or(z.literal("")),
  fleetSize: z.coerce.number().int().min(0).max(100000).optional(),
  operatesOwnFleet: z.boolean().optional(),
  recruitsDirectly: z.boolean().optional(),
  companyType: z.enum(["direct_employer", "recruitment_agency", "subcontractor", "intermediary"]),
  contractingEntity: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const verificationSubmitSchema = z.object({
  registrationNumber: z.string().trim().min(2, "Enter the registration number").max(40),
  registeredAddress: z.string().trim().min(5, "Enter the registered business address").max(300),
  contactPerson: z.string().trim().min(2, "Enter a contact person").max(120),
  businessEmail: email,
  website: z.string().trim().max(200).optional().or(z.literal("")),
  operatesOwnFleet: z.enum(["yes", "no"]),
  recruitsDirectly: z.enum(["yes", "no"]),
  contractingEntity: z.string().trim().min(2, "Identify the contracting legal entity").max(200),
  evidenceNotes: z
    .string()
    .trim()
    .min(20, "Describe the evidence you can provide (chamber of commerce extract, licence, etc.)")
    .max(2000),
  confirmTruth: z.literal("on", { message: "You must confirm the information is accurate" }),
  confirmIdentityChange: z.string().optional(),
});

const optionalMoney = z
  .union([z.coerce.number().int().min(0).max(1_000_000), z.literal("")])
  .transform((v) => (v === "" ? null : v));

export const vacancySchema = z.object({
  title: z.string().trim().min(3, "Enter a job title").max(140),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  country: z.string().trim().length(2, "Select the employment country"),
  contractingEntity: z.string().trim().min(2, "Identify the contracting legal entity").max(200),
  transportCategory: z.enum([
    "reefer",
    "adr_tanker",
    "adr_tank_container",
    "container",
    "box_general",
    "regional",
    "other",
  ]),
  licenceRequirements: z.string().trim().max(200).optional().or(z.literal("")),
  experienceRequirements: z.string().trim().max(1000).optional().or(z.literal("")),
  contractType: z.enum(["permanent", "fixed_term", "temporary_agency", "subcontract", "freelance"]),
  grossPayMin: optionalMoney,
  grossPayMax: optionalMoney,
  currency: z.string().trim().length(3).default("EUR"),
  payPeriod: z.enum(["month", "week", "hour"]),
  payStructure: z.string().trim().max(2000).optional().or(z.literal("")),
  allowances: z.string().trim().max(2000).optional().or(z.literal("")),
  workingPattern: z.string().trim().max(300).optional().or(z.literal("")),
  rotation: z.string().trim().max(200).optional().or(z.literal("")),
  homeTime: z.string().trim().max(300).optional().or(z.literal("")),
  loadingUnloading: z.enum(["none", "occasional", "full"]),
  accommodation: z.enum([
    "provided_free",
    "provided_deducted",
    "optional",
    "not_provided",
    "not_disclosed",
  ]),
  accommodationDetails: z.string().trim().max(1000).optional().or(z.literal("")),
  weeklyRest: z.string().trim().max(500).optional().or(z.literal("")),
  vehicleType: z.string().trim().max(200).optional().or(z.literal("")),
  equipment: z.string().trim().max(1000).optional().or(z.literal("")),
  operatingCountries: z.string().trim().max(200).optional().or(z.literal("")),
  languagesRequired: z.string().trim().max(200).optional().or(z.literal("")),
  trainingProvided: z.string().trim().max(1000).optional().or(z.literal("")),
  benefits: z.string().trim().max(2000).optional().or(z.literal("")),
  applicationMethod: z.enum(["external_link", "email", "platform_message"]),
  applicationUrl: z.string().trim().max(500).optional().or(z.literal("")),
  applicationEmail: z.string().trim().max(254).optional().or(z.literal("")),
  contactName: z.string().trim().max(120).optional().or(z.literal("")),
  intendToPublish: z.boolean().optional(),
});

export type VacancyInput = z.infer<typeof vacancySchema>;

export const reviewSchema = z.object({
  companyId: z.string().uuid(),
  jobTitle: z.string().trim().max(120).optional().or(z.literal("")),
  employmentStart: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Enter the month you started (YYYY-MM)")
    .transform((v) => `${v}-01`),
  employmentEnd: z
    .string()
    .regex(/^$|^\d{4}-\d{2}$/, "Enter the month you left (YYYY-MM)")
    .optional()
    .transform((v) => (v ? `${v}-01` : null)),
  overallRating: z.coerce.number().int().min(1).max(5),
  paymentReliability: z.coerce.number().int().min(0).max(5).optional(),
  advertAccuracy: z.coerce.number().int().min(0).max(5).optional(),
  dispatchManagement: z.coerce.number().int().min(0).max(5).optional(),
  equipment: z.coerce.number().int().min(0).max(5).optional(),
  homeTime: z.coerce.number().int().min(0).max(5).optional(),
  accommodation: z.coerce.number().int().min(0).max(5).optional(),
  deductions: z.coerce.number().int().min(0).max(5).optional(),
  workingConditions: z.coerce.number().int().min(0).max(5).optional(),
  title: z.string().trim().min(5, "Add a short headline").max(120),
  body: z
    .string()
    .trim()
    .min(80, "Describe your experience in at least 80 characters")
    .max(4000, "Keep your review under 4,000 characters"),
  eligibilityAttested: z.literal("on", {
    message: "Confirm that you worked for this company",
  }),
  publicationConsent: z.literal("on", {
    message: "Confirm that your review may be published pseudonymously",
  }),
});

export const enquirySchema = z.object({
  vacancyId: z.string().uuid(),
  message: z.string().trim().min(40, "Write at least 40 characters").max(3000),
  shareEmail: z.boolean().optional(),
  sharePhone: z.boolean().optional(),
});

export const reportSchema = z.object({
  targetType: z.enum(["review", "vacancy", "company", "message"]),
  targetId: z.string().uuid(),
  reason: z.string().trim().min(2).max(100),
  details: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(20).max(3000),
});

export const responseSchema = z.object({
  reviewId: z.string().uuid(),
  body: z.string().trim().min(20, "Write at least 20 characters").max(2000),
});

export const moderationSchema = z.object({
  decision: z.enum(["approved", "rejected", "needs_information"]),
  notes: z.string().trim().min(10, "Record your reasoning (min. 10 characters)").max(2000),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z.string().min(10, "Use at least 10 characters").max(200),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const REVIEW_FIELDS = REVIEW_CATEGORIES.map((c) => c.key);
