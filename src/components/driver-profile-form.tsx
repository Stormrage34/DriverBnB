"use client";

import { useActionState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { updateDriverProfileAction, type ActionState } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, FieldError, HelpText, Input, Label, Select, Textarea } from "@/components/ui/field";
import { COUNTRIES } from "@/lib/constants";
import type { DriverProfile } from "@/db/schema";

export function DriverProfileForm({ profile }: { profile: DriverProfile | null }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateDriverProfileAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Driving qualifications</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" name="firstName" defaultValue={profile?.firstName ?? ""} autoComplete="given-name" />
          </div>
          <div>
            <Label htmlFor="countryOfResidence">Country of residence</Label>
            <Select id="countryOfResidence" name="countryOfResidence" defaultValue={profile?.countryOfResidence ?? ""}>
              <option value="">Prefer not to say</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="licenceCategories" hint="comma separated">Licence categories</Label>
            <Input id="licenceCategories" name="licenceCategories" defaultValue={profile?.licenceCategories.join(", ") ?? "C+E"} placeholder="C, C+E" />
          </div>
          <div>
            <Label htmlFor="yearsExperience">Years of experience</Label>
            <Input id="yearsExperience" name="yearsExperience" type="number" min={0} max={60} defaultValue={profile?.yearsExperience ?? ""} />
          </div>
          <div>
            <Label htmlFor="languages" hint="comma separated">Languages</Label>
            <Input id="languages" name="languages" defaultValue={profile?.languages.join(", ") ?? ""} placeholder="English, Bulgarian, German" />
            <HelpText>List the languages you can work in, not your level claims.</HelpText>
          </div>
          <div>
            <Label htmlFor="adrClasses" hint="comma separated">ADR classes</Label>
            <Input id="adrClasses" name="adrClasses" defaultValue={profile?.adrClasses.join(", ") ?? ""} placeholder="1.1, 2, 3, 8, 9" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
            <Checkbox name="code95" label="I hold Code 95 / CPC" defaultChecked={profile?.code95 ?? false} className="flex-1" />
            <Checkbox name="adrQualified" label="I hold an ADR certificate" defaultChecked={profile?.adrQualified ?? false} className="flex-1" />
          </div>
          <div className="sm:col-span-2">
            <p className="rounded-xl bg-paper px-4 py-3 text-xs leading-relaxed text-muted">
              DriverCompass does not verify licences or certificates in this pilot. Your declarations are shown
              to you as unverified until a verification feature exists — never assume a badge exists where it
              does not.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Experience & preferences</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="transportExperience">Transport experience</Label>
            <Textarea
              id="transportExperience"
              name="transportExperience"
              defaultValue={profile?.transportExperience ?? ""}
              rows={4}
              placeholder="Types of transport, equipment, countries and routes you have worked. Keep it factual."
            />
          </div>
          <div>
            <Label htmlFor="preferredCategories" hint="comma separated">Preferred transport categories</Label>
            <Input id="preferredCategories" name="preferredCategories" defaultValue={profile?.preferredCategories.join(", ") ?? ""} placeholder="Reefer, ADR tanker" />
          </div>
          <div>
            <Label htmlFor="preferredCountries" hint="comma separated">Preferred working countries</Label>
            <Input id="preferredCountries" name="preferredCountries" defaultValue={profile?.preferredCountries.join(", ") ?? ""} placeholder="NL, BE, DE" />
          </div>
          <div>
            <Label htmlFor="preferredRotation">Preferred rotation</Label>
            <Input id="preferredRotation" name="preferredRotation" defaultValue={profile?.preferredRotation ?? ""} placeholder="2 weeks out / 3 days home" />
          </div>
          <div>
            <Label htmlFor="availability">Availability</Label>
            <Input id="availability" name="availability" defaultValue={profile?.availability ?? ""} placeholder="Available from March" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact & privacy</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="contactEmail">Contact email for enquiries</Label>
            <Input id="contactEmail" name="contactEmail" type="email" defaultValue={profile?.contactEmail ?? ""} placeholder="you@example.com" />
            <HelpText>Shared only if you tick “share email” on a specific enquiry.</HelpText>
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ""} placeholder="+31 …" />
            <HelpText>Shared only if you tick “share phone” on a specific enquiry.</HelpText>
          </div>
          <div className="sm:col-span-2">
            <p className="rounded-xl bg-paper px-4 py-3 text-xs leading-relaxed text-muted">
              Your profile is private. This pilot has no employer search and no contact-request
              mechanism, so there is nothing here to opt in to. Employers see only what you send in
              an enquiry.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Checkbox
              name="cvUploadNotice"
              disabled
              label="CV upload is not enabled in this pilot"
              hint="The storage model is built (private object key + access control), but no public upload is exposed yet."
            />
          </div>
        </CardBody>
      </Card>

      <FieldError>{state?.error}</FieldError>
      {state?.success ? (
        <p className="flex items-center gap-2 rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
          <CheckCircle2 size={15} /> {state.success}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          <Save size={15} /> {pending ? "Saving…" : "Save profile"}
        </Button>
        <p className="text-xs text-muted">Nothing here is published automatically.</p>
      </div>
    </form>
  );
}
