import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info, ShieldCheck } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stars, RatingBar } from "@/components/rating";
import { ReviewCard } from "@/components/review-card";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getCompanyBySlug, getCompanyRatingBreakdown, getCompanyReviews } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) return { title: "Company not found" };
  return { title: `Driver reviews — ${company.tradingName ?? company.legalName}` };
}

export default async function CompanyReviewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company || company.verificationStatus === "suspended") notFound();

  const [reviews, breakdown, user] = await Promise.all([
    getCompanyReviews(company.id),
    getCompanyRatingBreakdown(company.id),
    getCurrentUser(),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link href={`/companies/${company.slug}`} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink">
        <ArrowLeft size={13} /> Back to {company.tradingName ?? company.legalName}
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_19rem]">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Driver reviews</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Reviews of measurable employment conditions from drivers who state they worked here. Every
              review is checked for eligibility and personal data before publication — and employers get a
              right of reply, not a right of deletion.
            </p>
          </div>

          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-strong bg-surface/60 px-6 py-10 text-center">
              <p className="text-sm font-semibold">No published reviews yet</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
                Reviews appear only after a driver attests to a real employment experience and a moderator
                approves publication.
              </p>
            </div>
          ) : (
            reviews.map((row) => (
              <ReviewCard
                key={row.review.id}
                review={row.review}
                authorName={row.authorName}
                responses={row.responses}
              />
            ))
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Rating summary</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-semibold tracking-tight">
                  {breakdown.average === null ? "—" : breakdown.average.toFixed(1)}
                </span>
                <div className="pb-1">
                  <Stars value={breakdown.average} size={16} />
                  <p className="mt-1 text-xs text-muted">{breakdown.count} published reviews</p>
                </div>
              </div>

              {breakdown.count > 0 ? (
                <div className="mt-5 space-y-2.5">
                  <RatingBar label="Payment reliability" value={breakdown.categories.paymentReliability} />
                  <RatingBar label="Advert accuracy" value={breakdown.categories.advertAccuracy} />
                  <RatingBar label="Dispatch" value={breakdown.categories.dispatchManagement} />
                  <RatingBar label="Equipment" value={breakdown.categories.equipment} />
                  <RatingBar label="Home time" value={breakdown.categories.homeTime} />
                  <RatingBar label="Accommodation" value={breakdown.categories.accommodation} />
                  <RatingBar label="Deductions" value={breakdown.categories.deductions} />
                  <RatingBar label="Conditions" value={breakdown.categories.workingConditions} />
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3 text-xs leading-relaxed text-ink-soft">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <ShieldCheck size={14} className="text-success" /> How reviews stay credible
              </p>
              <p>1. The reviewer states the employment period and attests to the experience.</p>
              <p>2. One review per driver per employment period; duplicates are blocked.</p>
              <p>3. Moderators check for personal data, abuse and unsubstantiated criminal allegations.</p>
              <p>4. Employers may respond publicly. Removal requires a policy breach, never a payment.</p>
              <p className="pt-1">
                <Link href="/review-policy" className="font-medium text-brand underline-offset-4 hover:underline">
                  Full review policy →
                </Link>
              </p>
            </CardBody>
          </Card>

          {user?.role === "driver" ? (
            <ButtonLink href={`/dashboard/reviews/new?company=${company.slug}`} variant="primary" className="w-full">
              Review this employer
            </ButtonLink>
          ) : user ? null : (
            <ButtonLink href={`/login?next=/companies/${company.slug}/reviews`} variant="secondary" className="w-full">
              Log in to write a review
            </ButtonLink>
          )}

          <div className="rounded-2xl border border-line bg-surface p-4 text-[0.7rem] leading-relaxed text-muted">
            <p className="flex items-center gap-1.5 font-medium text-ink-soft">
              <Info size={12} /> Illustrative content
            </p>
            <p className="mt-1">
              {company.isDemoSeed
                ? "This company and its reviews are demo data created for the pilot build."
                : "Ratings reflect published driver reviews only. They are not an endorsement by DriverCompass."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
