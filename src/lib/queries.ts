import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { FULLY_VERIFIED_STATUS, TRUSTED_VERIFICATION_VERSION } from "@/lib/verification";
import {
  companies,
  companyVerifications,
  driverProfiles,
  driverReviews,
  enquiries,
  reviewResponses,
  vacancies,
  savedVacancies,
  savedCompanies,
  contentReports,
  auditLogs,
  users,
  type Company,
  type Vacancy,
} from "@/db/schema";

export const ACTIVE_VACANCY_STATUSES = [
  "published_unverified",
  "published_verified",
  "confirmed",
  "reconfirmation_required",
] as const;

export type VacancyFilters = {
  q?: string;
  countries?: string[];
  categories?: string[];
  adr?: boolean;
  payMin?: number;
  payMax?: number;
  accommodation?: string[];
  loading?: string[];
  directOnly?: boolean;
  verifiedOnly?: boolean;
  language?: string;
  sort?: "relevance" | "newest" | "pay";
  page?: number;
  perPage?: number;
};

export type CompanyFilters = {
  q?: string;
  country?: string;
  type?: string;
  sector?: string;
  verifiedOnly?: boolean;
  page?: number;
  perPage?: number;
};

function likePattern(value: string): string {
  return `%${value.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
}

const monthlyPay = sql<number>`(case ${vacancies.payPeriod}
  when 'week' then ${vacancies.grossPayMin} * 4.333
  when 'hour' then ${vacancies.grossPayMin} * 173.33
  else ${vacancies.grossPayMin} end)`;

const monthlyPayMax = sql<number>`(case ${vacancies.payPeriod}
  when 'week' then coalesce(${vacancies.grossPayMax}, ${vacancies.grossPayMin}) * 4.333
  when 'hour' then coalesce(${vacancies.grossPayMax}, ${vacancies.grossPayMin}) * 173.33
  else coalesce(${vacancies.grossPayMax}, ${vacancies.grossPayMin}) end)`;

export type VacancyListRow = {
  vacancy: Vacancy;
  company: Company;
  rating: { average: number | null; count: number };
};

export async function searchVacancies(filters: VacancyFilters): Promise<{
  rows: VacancyListRow[];
  total: number;
  page: number;
  perPage: number;
}> {
  const rawPage = Number(filters.page ?? 1);
  const rawPerPage = Number(filters.perPage ?? 12);
  const page = Number.isFinite(rawPage) ? Math.min(500, Math.max(1, Math.floor(rawPage))) : 1;
  const perPage = Number.isFinite(rawPerPage) ? Math.min(50, Math.max(6, Math.floor(rawPerPage))) : 12;

  const countryList = (filters.countries ?? []).filter((code) => /^[A-Z]{2}$/.test(code));
  const categoryList = (filters.categories ?? []).filter((value) =>
    (vacancies.transportCategory.enumValues as readonly string[]).includes(value),
  );
  const accommodationList = (filters.accommodation ?? []).filter((value) =>
    (vacancies.accommodation.enumValues as readonly string[]).includes(value),
  );
  const loadingList = (filters.loading ?? []).filter((value) =>
    (vacancies.loadingUnloading.enumValues as readonly string[]).includes(value),
  );
  const payMin =
    typeof filters.payMin === "number" && Number.isFinite(filters.payMin) && filters.payMin >= 0
      ? filters.payMin
      : undefined;
  const payMax =
    typeof filters.payMax === "number" && Number.isFinite(filters.payMax) && filters.payMax >= 0
      ? filters.payMax
      : undefined;
  const sort = filters.sort === "newest" || filters.sort === "pay" ? filters.sort : "relevance";

  const conditions = [
    inArray(vacancies.status, [...ACTIVE_VACANCY_STATUSES]),
    ne(companies.verificationStatus, "suspended"),
    isNull(companies.suspendedAt),
  ];

  if (filters.q) {
    const pattern = likePattern(filters.q);
    conditions.push(
      or(
        ilike(vacancies.title, pattern),
        ilike(companies.legalName, pattern),
        ilike(companies.tradingName, pattern),
        ilike(vacancies.city, pattern),
      )!,
    );
  }
  if (countryList.length) conditions.push(inArray(vacancies.country, countryList));
  if (categoryList.length) {
    conditions.push(
      inArray(
        vacancies.transportCategory,
        categoryList as (typeof vacancies.transportCategory.enumValues)[number][],
      ),
    );
  }
  if (filters.adr) {
    conditions.push(
      or(
        inArray(vacancies.transportCategory, ["adr_tanker", "adr_tank_container"]),
        sql`${vacancies.licenceRequirements}::text ilike '%ADR%'`,
      )!,
    );
  }
  if (payMin !== undefined) conditions.push(sql`${monthlyPay} >= ${payMin}`);
  if (payMax !== undefined) conditions.push(sql`${monthlyPayMax} <= ${payMax}`);
  if (accommodationList.length) {
    conditions.push(
      inArray(
        vacancies.accommodation,
        accommodationList as (typeof vacancies.accommodation.enumValues)[number][],
      ),
    );
  }
  if (loadingList.length) {
    conditions.push(
      inArray(
        vacancies.loadingUnloading,
        loadingList as (typeof vacancies.loadingUnloading.enumValues)[number][],
      ),
    );
  }
  if (filters.language) {
    conditions.push(arrayContains(vacancies.languagesRequired, [filters.language]));
  }
  if (filters.directOnly) conditions.push(eq(companies.companyType, "direct_employer"));
  if (filters.verifiedOnly) {
    conditions.push(
      and(
        eq(companies.verificationStatus, FULLY_VERIFIED_STATUS),
        gte(companies.verificationVersion, TRUSTED_VERIFICATION_VERSION),
      )!,
    );
  }

  const where = and(...conditions);

  const order = (() => {
    if (sort === "newest") return [desc(vacancies.publishedAt), desc(vacancies.createdAt)];
    if (sort === "pay") return [desc(monthlyPayMax), desc(vacancies.infoScore)];
    return [
      desc(sql`case ${companies.verificationStatus}
        when 'verified' then 3
        when 'direct_employer_checked' then 2
        when 'identity_checked' then 1
        else 0 end`),
      desc(sql`case ${vacancies.status}
        when 'confirmed' then 2
        when 'published_verified' then 1
        else 0 end`),
      desc(vacancies.infoScore),
      desc(vacancies.lastConfirmedAt),
    ];
  })();

  const [rows, totalRow] = await Promise.all([
    db
      .select({ vacancy: vacancies, company: companies })
      .from(vacancies)
      .innerJoin(companies, eq(vacancies.companyId, companies.id))
      .where(where)
      .orderBy(...order)
      .limit(perPage)
      .offset((page - 1) * perPage),
    db
      .select({ value: count() })
      .from(vacancies)
      .innerJoin(companies, eq(vacancies.companyId, companies.id))
      .where(where),
  ]);

  const ratings = await ratingMap(rows.map((r) => r.company.id));

  return {
    rows: rows.map((r) => ({ ...r, rating: ratings.get(r.company.id) ?? { average: null, count: 0 } })),
    total: Number(totalRow[0]?.value ?? 0),
    page,
    perPage,
  };
}

export async function ratingMap(
  companyIds: string[],
): Promise<Map<string, { average: number | null; count: number }>> {
  const map = new Map<string, { average: number | null; count: number }>();
  if (companyIds.length === 0) return map;

  const rows = await db
    .select({
      companyId: driverReviews.companyId,
      average: sql<string | null>`avg(${driverReviews.overallRating})`,
      count: count(),
    })
    .from(driverReviews)
    .where(and(inArray(driverReviews.companyId, companyIds), eq(driverReviews.status, "published")))
    .groupBy(driverReviews.companyId);

  for (const row of rows) {
    map.set(row.companyId, {
      average: row.average === null ? null : Number(row.average),
      count: Number(row.count),
    });
  }
  return map;
}

export async function listCompanies(filters: CompanyFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(50, Math.max(6, filters.perPage ?? 12));

  const conditions = [
    ne(companies.verificationStatus, "suspended"),
    isNull(companies.suspendedAt),
  ];
  if (filters.q) {
    const pattern = likePattern(filters.q);
    conditions.push(
      or(
        ilike(companies.legalName, pattern),
        ilike(companies.tradingName, pattern),
        ilike(companies.description, pattern),
      )!,
    );
  }
  if (filters.country) conditions.push(eq(companies.country, filters.country));
  if (filters.type) {
    conditions.push(eq(companies.companyType, filters.type as Company["companyType"]));
  }
  if (filters.sector) conditions.push(arrayContains(companies.sectors, [filters.sector]));
  if (filters.verifiedOnly) {
    conditions.push(
      and(
        eq(companies.verificationStatus, FULLY_VERIFIED_STATUS),
        gte(companies.verificationVersion, TRUSTED_VERIFICATION_VERSION),
      )!,
    );
  }

  const where = and(...conditions);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        company: companies,
        vacancyCount: sql<number>`(select count(*) from ${vacancies} v
          where v.company_id = ${companies.id}
          and v.status in ('published_unverified','published_verified','confirmed','reconfirmation_required'))`,
      })
      .from(companies)
      .where(where)
      .orderBy(
        desc(sql`case ${companies.verificationStatus} when 'verified' then 2 when 'direct_employer_checked' then 1 else 0 end`),
        asc(companies.legalName),
      )
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ value: count() }).from(companies).where(where),
  ]);

  const ratings = await ratingMap(rows.map((r) => r.company.id));

  return {
    rows: rows.map((r) => ({
      ...r,
      vacancyCount: Number(r.vacancyCount),
      rating: ratings.get(r.company.id) ?? { average: null, count: 0 },
    })),
    total: Number(totalRow[0]?.value ?? 0),
    page,
    perPage,
  };
}

export async function getCompanyBySlug(slug: string) {
  const [company] = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.slug, slug),
        ne(companies.verificationStatus, "suspended"),
        isNull(companies.suspendedAt),
      ),
    )
    .limit(1);
  return company ?? null;
}

export async function getCompanyActiveVacancies(companyId: string) {
  return db
    .select({ vacancy: vacancies })
    .from(vacancies)
    .innerJoin(companies, eq(vacancies.companyId, companies.id))
    .where(
      and(
        eq(vacancies.companyId, companyId),
        inArray(vacancies.status, [...ACTIVE_VACANCY_STATUSES]),
        ne(companies.verificationStatus, "suspended"),
        isNull(companies.suspendedAt),
      ),
    )
    .orderBy(desc(vacancies.lastConfirmedAt))
    .then((rows) => rows.map((row) => row.vacancy));
}

export async function getCompanyReviews(companyId: string) {
  const reviews = await db
    .select({
      review: driverReviews,
      authorName: users.displayName,
    })
    .from(driverReviews)
    .innerJoin(users, eq(driverReviews.driverUserId, users.id))
    .innerJoin(companies, eq(driverReviews.companyId, companies.id))
    .where(
      and(
        eq(driverReviews.companyId, companyId),
        eq(driverReviews.status, "published"),
        ne(companies.verificationStatus, "suspended"),
        isNull(companies.suspendedAt),
      ),
    )
    .orderBy(desc(driverReviews.publishedAt));

  if (reviews.length === 0) return [];

  const responses = await db
    .select()
    .from(reviewResponses)
    .where(
      and(
        inArray(
          reviewResponses.reviewId,
          reviews.map((r) => r.review.id),
        ),
        eq(reviewResponses.status, "published"),
      ),
    );

  return reviews.map((r) => ({
    ...r,
    responses: responses.filter((resp) => resp.reviewId === r.review.id),
  }));
}

export async function getCompanyRatingBreakdown(companyId: string) {
  const [row] = await db
    .select({
      count: count(),
      average: sql<string | null>`avg(${driverReviews.overallRating})`,
      payment: sql<string | null>`avg(${driverReviews.paymentReliability})`,
      advert: sql<string | null>`avg(${driverReviews.advertAccuracy})`,
      dispatch: sql<string | null>`avg(${driverReviews.dispatchManagement})`,
      equipment: sql<string | null>`avg(${driverReviews.equipment})`,
      homeTime: sql<string | null>`avg(${driverReviews.homeTime})`,
      accommodation: sql<string | null>`avg(${driverReviews.accommodation})`,
      deductions: sql<string | null>`avg(${driverReviews.deductions})`,
      conditions: sql<string | null>`avg(${driverReviews.workingConditions})`,
    })
    .from(driverReviews)
    .where(and(eq(driverReviews.companyId, companyId), eq(driverReviews.status, "published")));

  return {
    count: Number(row?.count ?? 0),
    average: row?.average ? Number(row.average) : null,
    categories: {
      paymentReliability: row?.payment ? Number(row.payment) : null,
      advertAccuracy: row?.advert ? Number(row.advert) : null,
      dispatchManagement: row?.dispatch ? Number(row.dispatch) : null,
      equipment: row?.equipment ? Number(row.equipment) : null,
      homeTime: row?.homeTime ? Number(row.homeTime) : null,
      accommodation: row?.accommodation ? Number(row.accommodation) : null,
      deductions: row?.deductions ? Number(row.deductions) : null,
      workingConditions: row?.conditions ? Number(row.conditions) : null,
    },
  };
}

export async function getVacancyBySlug(slug: string) {
  const [row] = await db
    .select({ vacancy: vacancies, company: companies })
    .from(vacancies)
    .innerJoin(companies, eq(vacancies.companyId, companies.id))
    .where(
      and(
        eq(vacancies.slug, slug),
        ne(companies.verificationStatus, "suspended"),
        isNull(companies.suspendedAt),
      ),
    )
    .limit(1);
  if (!row) return null;
  const ratings = await ratingMap([row.company.id]);
  return { ...row, rating: ratings.get(row.company.id) ?? { average: null, count: 0 } };
}

export async function getDriverProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(driverProfiles)
    .where(eq(driverProfiles.userId, userId))
    .limit(1);
  return profile ?? null;
}

export async function getDriverDashboard(userId: string) {
  const [enquiryRows, savedJobRows, reviewRows, profile] = await Promise.all([
    db
      .select({ enquiry: enquiries, vacancy: vacancies, company: companies })
      .from(enquiries)
      .leftJoin(vacancies, eq(enquiries.vacancyId, vacancies.id))
      .innerJoin(companies, eq(enquiries.companyId, companies.id))
      .where(eq(enquiries.driverUserId, userId))
      .orderBy(desc(enquiries.createdAt))
      .limit(25),
    db
      .select({ vacancy: vacancies, company: companies })
      .from(savedVacancies)
      .innerJoin(vacancies, eq(savedVacancies.vacancyId, vacancies.id))
      .innerJoin(companies, eq(vacancies.companyId, companies.id))
      .where(
        and(
          eq(savedVacancies.userId, userId),
          inArray(vacancies.status, [...ACTIVE_VACANCY_STATUSES]),
          isNull(companies.suspendedAt),
          ne(companies.verificationStatus, "suspended"),
        ),
      )
      .orderBy(desc(savedVacancies.createdAt)),
    db
      .select({ review: driverReviews, company: companies })
      .from(driverReviews)
      .innerJoin(companies, eq(driverReviews.companyId, companies.id))
      .where(eq(driverReviews.driverUserId, userId))
      .orderBy(desc(driverReviews.createdAt)),
    getDriverProfile(userId),
  ]);

  return { enquiries: enquiryRows, savedJobs: savedJobRows, reviews: reviewRows, profile };
}

export async function getSavedCompanies(userId: string) {
  const rows = await db
    .select({ company: companies })
    .from(savedCompanies)
    .innerJoin(companies, eq(savedCompanies.companyId, companies.id))
    .where(
      and(
        eq(savedCompanies.userId, userId),
        isNull(companies.suspendedAt),
        ne(companies.verificationStatus, "suspended"),
      ),
    )
    .orderBy(desc(savedCompanies.createdAt));
  return rows;
}

export async function isCompanySaved(userId: string, companyId: string) {
  const [row] = await db
    .select({ id: savedCompanies.id })
    .from(savedCompanies)
    .where(and(eq(savedCompanies.userId, userId), eq(savedCompanies.companyId, companyId)))
    .limit(1);
  return Boolean(row);
}

export async function isVacancySaved(userId: string, vacancyId: string) {
  const [row] = await db
    .select({ id: savedVacancies.id })
    .from(savedVacancies)
    .where(and(eq(savedVacancies.userId, userId), eq(savedVacancies.vacancyId, vacancyId)))
    .limit(1);
  return Boolean(row);
}

export async function getCompanyForUser(userId: string) {
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.ownerUserId, userId))
    .limit(1);
  return company ?? null;
}

export async function getEmployerVacancies(companyId: string) {
  return db
    .select()
    .from(vacancies)
    .where(eq(vacancies.companyId, companyId))
    .orderBy(desc(vacancies.updatedAt));
}

export async function getEmployerEnquiries(companyId: string) {
  return db
    .select({
      enquiry: enquiries,
      vacancy: vacancies,
      // The driver's account email and user id are deliberately not selected.
      // Only contact details stored on the enquiry (explicitly shared per
      // enquiry) may reach the employer.
      driverName: users.displayName,
    })
    .from(enquiries)
    .leftJoin(vacancies, eq(enquiries.vacancyId, vacancies.id))
    .innerJoin(users, eq(enquiries.driverUserId, users.id))
    .where(eq(enquiries.companyId, companyId))
    .orderBy(desc(enquiries.createdAt))
    .limit(100);
}

export async function getEmployerReviews(companyId: string) {
  return db
    .select({ review: driverReviews, authorName: users.displayName })
    .from(driverReviews)
    .innerJoin(users, eq(driverReviews.driverUserId, users.id))
    .where(and(eq(driverReviews.companyId, companyId), eq(driverReviews.status, "published")))
    .orderBy(desc(driverReviews.createdAt));
}

export async function getPendingVerifications() {
  const rows = await db
    .select({ company: companies, owner: users })
    .from(companies)
    .leftJoin(users, eq(companies.ownerUserId, users.id))
    .where(
      and(
        inArray(companies.verificationStatus, [
          "submitted",
          "identity_checked",
          "direct_employer_checked",
        ]),
        isNull(companies.suspendedAt),
      ),
    )
    .orderBy(asc(companies.updatedAt));

  if (rows.length === 0) return [];

  const submissions = await db
    .select()
    .from(companyVerifications)
    .where(
      inArray(
        companyVerifications.companyId,
        rows.map((row) => row.company.id),
      ),
    )
    .orderBy(desc(companyVerifications.createdAt));

  const latestByCompany = new Map<string, (typeof submissions)[number]>();
  for (const submission of submissions) {
    if (!latestByCompany.has(submission.companyId)) {
      latestByCompany.set(submission.companyId, submission);
    }
  }

  return rows.map((row) => ({
    ...row,
    submission: latestByCompany.get(row.company.id) ?? null,
  }));
}

export async function getVerificationSubmission(companyId: string) {
  const [row] = await db
    .select()
    .from(companyVerifications)
    .where(eq(companyVerifications.companyId, companyId))
    .orderBy(desc(companyVerifications.createdAt))
    .limit(1);
  return row ?? null;
}

export async function getRecentVerificationChanges(limit = 10) {
  return db
    .select({ log: auditLogs, actor: users })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id))
    .where(
      inArray(auditLogs.action, [
        "company.identity_changed",
        "company.operational_change",
      ]),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export type AdminCompanyState = "all" | "active" | "suspended";

export async function listAdminCompanies(input: {
  q?: string;
  state?: AdminCompanyState;
  limit?: number;
} = {}) {
  const conditions: SQL[] = [];
  if (input.q) {
    const pattern = likePattern(input.q);
    conditions.push(
      or(
        ilike(companies.legalName, pattern),
        ilike(companies.tradingName, pattern),
        ilike(companies.registrationNumber, pattern),
      )!,
    );
  }
  if (input.state === "suspended") {
    conditions.push(
      or(isNotNull(companies.suspendedAt), eq(companies.verificationStatus, "suspended"))!,
    );
  } else if (input.state === "active") {
    conditions.push(
      isNull(companies.suspendedAt),
      ne(companies.verificationStatus, "suspended"),
    );
  }

  return db
    .select({
      company: companies,
      ownerEmail: users.email,
    })
    .from(companies)
    .leftJoin(users, eq(companies.ownerUserId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(companies.updatedAt))
    .limit(Math.min(200, Math.max(10, input.limit ?? 100)));
}

export async function getAdminStats() {
  const [companyCounts] = await db
    .select({
      total: count(),
      verified: sql<number>`count(*) filter (where ${companies.verificationStatus} = 'verified' and ${companies.verificationVersion} >= 1)`,
      pending: sql<number>`count(*) filter (where ${companies.verificationStatus} in ('submitted','identity_checked','direct_employer_checked') and ${companies.suspendedAt} is null)`,
    })
    .from(companies);

  const [vacancyCounts] = await db
    .select({
      total: count(),
      active: sql<number>`count(*) filter (where ${vacancies.status} in ('published_unverified','published_verified','confirmed','reconfirmation_required'))`,
      stale: sql<number>`count(*) filter (where ${vacancies.status} in ('published_unverified','published_verified','confirmed') and ${vacancies.lastConfirmedAt} < now() - interval '30 days')`,
    })
    .from(vacancies);

  const [reviewCounts] = await db
    .select({
      total: count(),
      pending: sql<number>`count(*) filter (where ${driverReviews.status} = 'pending')`,
      published: sql<number>`count(*) filter (where ${driverReviews.status} = 'published')`,
    })
    .from(driverReviews);

  const [reportCounts] = await db
    .select({
      total: count(),
      open: sql<number>`count(*) filter (where ${contentReports.status} = 'open')`,
    })
    .from(contentReports);

  const [driverCount] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.role, "driver"));

  const [enquiryCount] = await db.select({ value: count() }).from(enquiries);

  return {
    companies: {
      total: Number(companyCounts?.total ?? 0),
      verified: Number(companyCounts?.verified ?? 0),
      pending: Number(companyCounts?.pending ?? 0),
    },
    vacancies: {
      total: Number(vacancyCounts?.total ?? 0),
      active: Number(vacancyCounts?.active ?? 0),
      stale: Number(vacancyCounts?.stale ?? 0),
    },
    reviews: {
      total: Number(reviewCounts?.total ?? 0),
      pending: Number(reviewCounts?.pending ?? 0),
      published: Number(reviewCounts?.published ?? 0),
    },
    reports: {
      total: Number(reportCounts?.total ?? 0),
      open: Number(reportCounts?.open ?? 0),
    },
    drivers: Number(driverCount?.value ?? 0),
    enquiries: Number(enquiryCount?.value ?? 0),
  };
}

export async function getAdminVacancies(status?: string) {
  const where = status
    ? inArray(vacancies.status, [status as (typeof vacancies.status.enumValues)[number]])
    : undefined;
  return db
    .select({ vacancy: vacancies, company: companies })
    .from(vacancies)
    .innerJoin(companies, eq(vacancies.companyId, companies.id))
    .where(where)
    .orderBy(desc(vacancies.updatedAt))
    .limit(100);
}

export async function getAdminReviews(status?: string) {
  const where = status
    ? inArray(driverReviews.status, [status as (typeof driverReviews.status.enumValues)[number]])
    : undefined;
  return db
    .select({ review: driverReviews, company: companies, authorName: users.displayName })
    .from(driverReviews)
    .innerJoin(companies, eq(driverReviews.companyId, companies.id))
    .innerJoin(users, eq(driverReviews.driverUserId, users.id))
    .where(where)
    .orderBy(desc(driverReviews.createdAt))
    .limit(100);
}

export async function getPendingReviewResponses() {
  return db
    .select({
      response: reviewResponses,
      review: driverReviews,
      company: companies,
    })
    .from(reviewResponses)
    .innerJoin(driverReviews, eq(reviewResponses.reviewId, driverReviews.id))
    .innerJoin(companies, eq(reviewResponses.companyId, companies.id))
    .where(eq(reviewResponses.status, "pending"))
    .orderBy(asc(reviewResponses.createdAt))
    .limit(100);
}

export async function getReports(status?: string) {
  return db
    .select({ report: contentReports, reporter: users })
    .from(contentReports)
    .leftJoin(users, eq(contentReports.reporterUserId, users.id))
    .where(
      status
        ? eq(contentReports.status, status as (typeof contentReports.status.enumValues)[number])
        : undefined,
    )
    .orderBy(desc(contentReports.createdAt))
    .limit(100);
}

export async function getAuditLogs(limit = 100) {
  return db
    .select({ log: auditLogs, actor: users })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function getVacancyCountForCompany(companyId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(vacancies)
    .where(
      and(
        eq(vacancies.companyId, companyId),
        inArray(vacancies.status, [...ACTIVE_VACANCY_STATUSES]),
      ),
    );
  return Number(row?.value ?? 0);
}

export async function getReviewForDriver(reviewId: string, driverUserId: string) {
  const [row] = await db
    .select()
    .from(driverReviews)
    .where(and(eq(driverReviews.id, reviewId), eq(driverReviews.driverUserId, driverUserId)))
    .limit(1);
  return row ?? null;
}

export async function getEnquiryForDriver(enquiryId: string, driverUserId: string) {
  const [row] = await db
    .select()
    .from(enquiries)
    .where(and(eq(enquiries.id, enquiryId), eq(enquiries.driverUserId, driverUserId)))
    .limit(1);
  return row ?? null;
}

export async function getCompanyVacancy(companyId: string, vacancyId: string) {
  const [row] = await db
    .select()
    .from(vacancies)
    .where(and(eq(vacancies.id, vacancyId), eq(vacancies.companyId, companyId)))
    .limit(1);
  return row ?? null;
}

export { lte, gte };
