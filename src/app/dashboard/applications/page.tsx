import Link from "next/link";
import { CheckCircle2, Clock, Eye, Mail, MessageSquare, Send } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { requireDriverPage } from "@/lib/guards";
import { getDriverDashboard } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { applicationMethodLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

const STATUS_TONE = {
  sent: "info",
  viewed: "warning",
  responded: "success",
  closed: "neutral",
} as const;

export default async function ApplicationsPage() {
  const user = await requireDriverPage();
  const { enquiries } = await getDriverDashboard(user.id);

  return (
    <div>
      <PageHeader
        title="My applications & enquiries"
        description="Every contact you initiated, with exactly what you shared. DriverCompass does not forward your CV anywhere."
        action={
          <ButtonLink href="/jobs" variant="secondary" size="sm">
            <Send size={14} /> Find more roles
          </ButtonLink>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Sent", value: enquiries.length, icon: Send },
          { label: "Employer viewed", value: enquiries.filter((e) => e.enquiry.status !== "sent").length, icon: Eye },
          { label: "Responded", value: enquiries.filter((e) => e.enquiry.status === "responded").length, icon: CheckCircle2 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-line bg-surface p-4">
            <stat.icon size={15} className="text-brand" />
            <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
            <p className="text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enquiry history</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {enquiries.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium">No enquiries yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                When you contact an employer, the message and the contact details you chose to share appear here.
              </p>
              <ButtonLink href="/jobs" variant="primary" size="sm" className="mt-4">
                Browse vacancies
              </ButtonLink>
            </div>
          ) : (
            enquiries.map((row) => (
              <article key={row.enquiry.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {row.vacancy ? (
                        <Link href={`/jobs/${row.vacancy.slug}`} className="underline-offset-4 hover:underline">
                          {row.vacancy.title}
                        </Link>
                      ) : (
                        "General enquiry"
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      <Link href={`/companies/${row.company.slug}`} className="underline-offset-4 hover:underline">
                        {row.company.tradingName ?? row.company.legalName}
                      </Link>
                      {" · "}
                      {applicationMethodLabel(row.enquiry.method)}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[row.enquiry.status as keyof typeof STATUS_TONE] ?? "neutral"}>
                    {row.enquiry.status === "viewed" ? "Viewed by employer" : row.enquiry.status}
                  </Badge>
                </div>

                <p className="mt-3 whitespace-pre-line rounded-xl bg-paper p-3 text-sm leading-relaxed text-ink-soft">
                  {row.enquiry.message}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.7rem] text-muted">
                  <span className="inline-flex items-center gap-1"><Clock size={12} /> Sent {formatDate(row.enquiry.createdAt)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Mail size={12} />
                    {row.enquiry.sharedEmail ? `Email shared: ${row.enquiry.sharedEmail}` : "Email not shared"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare size={12} />
                    {row.enquiry.sharedPhone ? "Phone shared" : "Phone not shared"}
                  </span>
                </div>
              </article>
            ))
          )}
        </CardBody>
      </Card>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        An employer may reply by email or phone if you shared those details. DriverCompass does not mediate the
        recruitment process and cannot compel an employer to respond.
      </p>
    </div>
  );
}
