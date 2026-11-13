# EU-first architecture and jurisdictional policy assessment

**Date:** 13 November 2026
**Status:** assessment only — no country-compliance engine, no legal conclusions, no legal advice.

## 1. Purpose

The product is built as an EU-first, globally extensible marketplace. The Netherlands is an initial
market candidate, not the product's legal or architectural boundary. This note records the
country-specific assumptions currently embedded in the code and proposes a policy layer for later
approval. It does not implement that layer.

The platform is not represented as legally compliant in the EU or globally. Compliance requires
qualified jurisdiction-specific review.

## 2. Current country-specific assumptions

| Area | Current implementation | Risk / limitation |
| --- | --- | --- |
| Country codes | ISO alpha-2 strings in users, companies, vacancies and filters | Good baseline, but no validation that the code is a supported operating jurisdiction |
| Currency | Vacancy currency defaults to `EUR`; the form does not offer a currency selector | A Polish, Czech, Swedish or non-euro vacancy cannot state its actual currency |
| Company registration | Free-text registration number; country field; no registry-format validation | Correctly avoids hardcoding one national format, but cannot verify a foreign registry number |
| Company type | `direct_employer`, `recruitment_agency`, `subcontractor`, `intermediary` | Useful EU-wide classification, but employment/intermediation rules differ by Member State |
| Phone numbers | Free text, max 40 characters | No country-specific validation; this is deliberately permissive |
| Addresses | Free-text registered address; country code | No postal-code or subdivision validation |
| Vacancy location | Country plus free-text city | No timezone on the vacancy; operational times are not location-aware |
| Employment conditions | Free-text rotation, home time, weekly rest, accommodation, pay structure, allowances | Preserves employer wording, but no normalized comparison fields or jurisdiction-specific requirements |
| Languages | Free-text list on the profile; vacancy language requirements are free text | No UI locale layer; English-only interface |
| Salary presentation | Gross integer amounts, explicit currency, explicit period | No conversion; no tax or net-pay interpretation. This is the correct conservative baseline |
| Date/time | `timestamptz` in the database; display uses server/runtime defaults | No explicit vacancy timezone or locale-aware formatting |
| Verification | Country-agnostic company verification workflow | Registry evidence and what counts as proof differ by Member State |
| Legal notices | Single English privacy notice, terms and review policy | No per-jurisdiction notices, translations or local mandatory wording |
| Data export/deletion | JSON export and account deletion implemented | Retention and review-reputation rules differ; KI-040 remains open |
| Email templates | English only; provider-independent abstraction | No localized templates or jurisdiction-specific sender identification |

## 3. Proposed policy layer (not implemented)

A later phase should introduce an explicit jurisdictional policy module rather than scattering
`if (country === ...)` branches through actions and queries. Minimum shape:

```ts
type JurisdictionPolicy = {
  countryCode: string;              // ISO 3166-1 alpha-2
  defaultCurrency: string;          // ISO 4217; never assumed
  supportedCurrencies: string[];
  defaultTimeZone: string;          // IANA zone
  companyRegistration: {
    label: string;
    pattern?: string;               // optional, non-blocking format hint
    evidenceGuidance: string;
  };
  employment: {
    minimumWorkingAge?: number;
    payTransparencyNotes?: string;
    agencyRulesNotes?: string;
    localNoticeRequirements?: string[];
  };
  privacy: {
    retentionNotes?: string;
    transferNotes?: string;
    localRepresentativeRequired?: boolean;
  };
  locale: {
    uiLanguages: string[];
    emailLanguages: string[];
    dateFormat: string;
    currencyFormat: string;
  };
};
```

Requirements for that phase:

- Store the employer's original values unchanged; store normalized comparison fields separately.
- Use ISO country codes and ISO currency codes; never silently convert or imply equivalence.
- Store an explicit IANA timezone for a vacancy's location when operational times matter.
- Keep country-specific validation configurable and non-blocking where the registry format is unknown.
- Keep legal notices and consent language explicit and localized; do not reuse one Member State's
  wording as a global default.
- Add a policy resolution function with tests for unknown/unsupported countries.
- Do not add a country or market until its legal and operational review is complete.

No migration is proposed in T-005. Any schema change for currency, timezone or normalized
employment fields requires a separate approval.

## 4. Legal review backlog

### EU-wide matters to assess

- GDPR, controller/processor roles, international transfers, retention and data-subject rights.
- Digital Services Act applicability, notice-and-action, moderation and rights of reply.
- Platform-to-business rules where applicable.
- EU platform-work legislation and its national implementations.
- Pay-transparency requirements and national implementations.
- Employment-intermediation and recruitment rules.
- Consumer, accessibility, e-commerce and electronic-communications obligations where applicable.
- Defamation, review moderation and liability for user content.
- Data retention, deletion and preservation requests.

### Member-State matters requiring local review

- Employment and recruitment/intermediation classification.
- Transport-sector employment rules.
- Company registry evidence and verification standards.
- Posting of workers and cross-border employment.
- Working time, rest, accommodation and return-home rules.
- National pay-transparency implementation.
- National platform-work implementation.
- Local tax, invoicing and business requirements.
- Mandatory language and consumer/employer notices.

### Non-EU expansion

- Design for jurisdiction-specific policies.
- Do not assume GDPR is the only privacy regime.
- Do not assume EU terms or consent satisfy non-EU requirements.
- Do not activate a non-EU market without separate legal and operational review.

## 5. Product boundary

The platform facilitates discovery and direct contact between drivers and employers. It does not
select or allocate candidates, negotiate wages, generate employment contracts, allocate freight,
track drivers, or charge per hire. The jurisdictional layer must not quietly turn the product into a
recruitment agency, staffing intermediary, transport operator or employment contractor.

## 6. Deferred decisions

1. Whether currency becomes a first-class editable field before the first non-euro market.
2. Whether vacancy timezone is required for all listings or only where operational times are stated.
3. Which country-specific validation, if any, is safe to enforce rather than warn about.
4. Which languages the pilot UI and transactional email must support.
5. Which EU/member-state legal reviews must precede any public pilot.
