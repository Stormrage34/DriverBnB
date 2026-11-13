import { eq } from "drizzle-orm";
import { Check, CreditCard, Info } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireEmployerPage } from "@/lib/guards";
import { getCompanyForUser } from "@/lib/queries";
import { db } from "@/lib/db";
import { companySubscriptions } from "@/db/schema";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EmployerBillingPage() {
  const user = await requireEmployerPage();
  const company = await getCompanyForUser(user.id);
  if (!company) return null;

  const [subscription] = await db
    .select()
    .from(companySubscriptions)
    .where(eq(companySubscriptions.companyId, company.id))
    .limit(1);

  const plan = SUBSCRIPTION_PLANS.find((p) => p.value === (subscription?.plan ?? "basic")) ?? SUBSCRIPTION_PLANS[0];

  return (
    <div>
      <PageHeader
        title="Plan & billing"
        description="Employer-funded visibility. Drivers never pay to search, read or contact."
        action={<Badge tone="warning">Billing not enabled in pilot</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Available plans</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-3 sm:grid-cols-2">
            {SUBSCRIPTION_PLANS.map((item) => {
              const current = item.value === plan.value;
              return (
                <div
                  key={item.value}
                  className={`rounded-2xl border p-4 ${current ? "border-brand bg-brand-100/40" : "border-line"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{item.name}</p>
                    {current ? <Badge tone="success">Current</Badge> : null}
                  </div>
                  <p className="mt-2 text-xl font-semibold tracking-tight">{item.price}</p>
                  <p className="text-[0.7rem] text-muted">{item.priceNote}</p>
                  <ul className="mt-3 space-y-1.5 text-xs text-ink-soft">
                    {item.features.map((feature) => (
                      <li key={feature} className="flex gap-1.5">
                        <Check size={12} className="mt-0.5 shrink-0 text-success" /> {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current subscription</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <p className="flex justify-between gap-3">
                <span className="text-muted">Plan</span>
                <span className="font-medium">{plan.name}</span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-muted">Status</span>
                <span className="font-medium capitalize">{subscription?.status ?? "active"}</span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-muted">Renews</span>
                <span className="font-medium">
                  {subscription?.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "—"}
                </span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-muted">Payment method</span>
                <span className="text-muted">None on file</span>
              </p>
            </CardBody>
          </Card>

          <div className="rounded-2xl border border-line bg-surface p-5 text-xs leading-relaxed text-muted">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <CreditCard size={14} /> Not billing yet
            </p>
            <p className="mt-2">
              This pilot build does not process payments. No card details are collected. Pricing is a
              hypothesis for the first pilot cohort.
            </p>
            <p className="mt-2 flex items-start gap-1.5">
              <Info size={12} className="mt-0.5 shrink-0" />
              When billing launches, paid promotion will be labelled and will never override a driver’s
              filters, verification status or review rating.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
