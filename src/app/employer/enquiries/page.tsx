import Link from "next/link";
import { CheckCircle2, Eye, Mail, Phone, Send } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { requireEmployerPage } from "@/lib/guards";
import { getCompanyForUser, getEmployerEnquiries } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { markEnquiryViewedAction } from "@/app/employer/actions";

export const dynamic = "force-dynamic";

export default async function EmployerEnquiriesPage() {
  const user = await requireEmployerPage();
  const company = await getCompanyForUser(user.id);
  if (!company) return null;

  const enquiries = await getEmployerEnquiries(company.id);
  const unread = enquiries.filter((row) => row.enquiry.status === "sent").length;

  return (
    <div>
      <PageHeader
        title="Enquiries"
        description="Direct messages from drivers. DriverCompass does not rank, filter or forward candidates."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone="info">{enquiries.length} total</Badge>
        <Badge tone={unread > 0 ? "warning" : "neutral"}>{unread} unread</Badge>
      </div>

      {enquiries.length === 0 ? (
        <Card>
          <CardBody className="py-14 text-center">
            <Send size={20} className="mx-auto text-muted" />
            <p className="mt-3 text-sm font-semibold">No enquiries yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Drivers contact you from your vacancy pages. Complete pay and condition fields to receive
              better-informed enquiries.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {enquiries.map((row) => (
            <Card key={row.enquiry.id}>
              <CardBody>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{row.driverName}</p>
                    <p className="text-xs text-muted">
                      {row.vacancy ? (
                        <Link href={`/jobs/${row.vacancy.slug}`} className="underline-offset-4 hover:underline">
                          {row.vacancy.title}
                        </Link>
                      ) : (
                        "General enquiry"
                      )}{" "}
                      · {formatDate(row.enquiry.createdAt)}
                    </p>
                  </div>
                  <Badge
                    tone={
                      row.enquiry.status === "sent"
                        ? "warning"
                        : row.enquiry.status === "responded"
                          ? "success"
                          : "info"
                    }
                  >
                    {row.enquiry.status === "sent" ? "New" : row.enquiry.status}
                  </Badge>
                </div>

                <p className="mt-3 whitespace-pre-line rounded-xl bg-paper p-4 text-sm leading-relaxed text-ink-soft">
                  {row.enquiry.message}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-muted">
                    <Mail size={12} />
                    {row.enquiry.sharedEmail ? (
                      <a href={`mailto:${row.enquiry.sharedEmail}`} className="font-medium text-brand underline-offset-4 hover:underline">
                        {row.enquiry.sharedEmail}
                      </a>
                    ) : (
                      "Driver did not share email"
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-muted">
                    <Phone size={12} />
                    {row.enquiry.sharedPhone ? (
                      <a href={`tel:${row.enquiry.sharedPhone}`} className="font-medium text-brand underline-offset-4 hover:underline">
                        {row.enquiry.sharedPhone}
                      </a>
                    ) : (
                      "Driver did not share phone"
                    )}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    {row.enquiry.status === "sent" ? (
                      <form action={markEnquiryViewedAction}>
                        <input type="hidden" name="enquiryId" value={row.enquiry.id} />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-ink-soft hover:bg-paper"
                        >
                          <Eye size={12} /> Mark as viewed
                        </button>
                      </form>
                    ) : row.enquiry.status === "viewed" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <CheckCircle2 size={12} /> Viewed {formatDate(row.enquiry.employerViewedAt)}
                      </span>
                    ) : null}
                  </span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-4 rounded-2xl border border-line bg-surface p-4 text-xs leading-relaxed text-muted">
        Reply directly by email or phone using the details the driver chose to share. Do not add the driver to
        a mailing list or share their details with third parties. Recruitment data is processed under your own
        privacy notice.
      </p>
    </div>
  );
}
