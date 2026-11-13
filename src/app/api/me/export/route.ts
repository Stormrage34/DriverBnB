import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  driverProfiles,
  driverReviews,
  enquiries,
  savedCompanies,
  savedVacancies,
  users,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const [account] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const [profile] = await db
    .select()
    .from(driverProfiles)
    .where(eq(driverProfiles.userId, user.id))
    .limit(1);

  const [myEnquiries, myReviews, jobs, comps] = await Promise.all([
    db.select().from(enquiries).where(eq(enquiries.driverUserId, user.id)).orderBy(desc(enquiries.createdAt)),
    db.select().from(driverReviews).where(eq(driverReviews.driverUserId, user.id)).orderBy(desc(driverReviews.createdAt)),
    db.select().from(savedVacancies).where(eq(savedVacancies.userId, user.id)),
    db.select().from(savedCompanies).where(and(eq(savedCompanies.userId, user.id))),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    notice:
      "This export contains the personal data DriverCompass holds about your account. Contact details you shared with employers are also held by those employers under their own privacy notices.",
    account,
    driverProfile: profile ?? null,
    enquiries: myEnquiries,
    reviews: myReviews,
    savedVacancies: jobs,
    savedCompanies: comps,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="drivercompass-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
