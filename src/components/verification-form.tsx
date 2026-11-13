"use client";

import { useActionState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { submitVerificationAction, type EmployerActionState } from "@/app/employer/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, FieldError, HelpText, Input, Label, Select, Textarea } from "@/components/ui/field";
import type { Company } from "@/db/schema";

export function VerificationForm({ company }: { company: Company }) {
  const [state, formAction, pending] = useActionState<EmployerActionState, FormData>(submitVerificationAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Evidence for review</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          {company.verificationStatus !== "unverified" ? (
            <div className="sm:col-span-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-xs leading-relaxed text-ink-soft">
              <strong className="text-ink">Resubmitting evidence does not remove completed checks.</strong>{" "}
              Changing the registration number, registered address or contracting entity resets identity and
              role checks. Changing the direct-recruitment answer resets the role check. Moderators see the
              previous and current values.
            </div>
          ) : null}
          <div>
            <Label htmlFor="registrationNumber" required hint="identity">Registration number</Label>
            <Input id="registrationNumber" name="registrationNumber" defaultValue={company.registrationNumber ?? ""} required />
          </div>
          <div>
            <Label htmlFor="contactPerson" required>Contact person</Label>
            <Input id="contactPerson" name="contactPerson" defaultValue={company.contactPerson ?? ""} required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="registeredAddress" required hint="identity">Registered business address</Label>
            <Input id="registeredAddress" name="registeredAddress" defaultValue={company.registeredAddress ?? ""} required />
          </div>
          <div>
            <Label htmlFor="businessEmail" required>Business email</Label>
            <Input id="businessEmail" name="businessEmail" type="email" defaultValue={company.businessEmail ?? ""} required />
          </div>
          <div>
            <Label htmlFor="website">Official website</Label>
            <Input id="website" name="website" type="url" defaultValue={company.website ?? ""} placeholder="https://" />
          </div>
          <div>
            <Label htmlFor="operatesOwnFleet" required>Do you operate your own fleet?</Label>
            <Select id="operatesOwnFleet" name="operatesOwnFleet" defaultValue={company.operatesOwnFleet ? "yes" : "no"}>
              <option value="yes">Yes — vehicles operated by our company</option>
              <option value="no">No — we arrange capacity through others</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="recruitsDirectly" required>Do you recruit directly?</Label>
            <Select id="recruitsDirectly" name="recruitsDirectly" defaultValue={company.recruitsDirectly ? "yes" : "no"}>
              <option value="yes">Yes — the contract is with our company</option>
              <option value="no">No — we act for another employer or client</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="contractingEntity" required hint="identity">Contracting legal entity</Label>
            <Input id="contractingEntity" name="contractingEntity" defaultValue={company.contractingEntity ?? company.legalName} required />
            <HelpText>Who signs the employment contract? This is shown on every vacancy.</HelpText>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="evidenceNotes" required>Evidence you can provide</Label>
            <Textarea
              id="evidenceNotes"
              name="evidenceNotes"
              rows={5}
              required
              minLength={20}
              defaultValue=""
              placeholder="Describe the registration extract, trade licence or other evidence you can send. A moderator will contact you at the business email to request documents. Do not paste personal data or full document numbers here."
            />
            <HelpText>Evidence is used only for verification and is never published.</HelpText>
          </div>
          <div className="sm:col-span-2">
            <Checkbox
              name="confirmTruth"
              label="I confirm this information is accurate and that I am authorised to submit it for this company."
              hint="False verification submissions lead to suspension and may be unlawful."
            />
          </div>
          {company.verificationStatus !== "unverified" ? (
            <div className="sm:col-span-2">
              <Checkbox
                name="confirmIdentityChange"
                label="I explicitly confirm any legal-identity or classification change in this submission. I understand it resets the affected verification check."
                hint="Required only when a verified identity or classification field changes."
              />
            </div>
          ) : null}
        </CardBody>
      </Card>

      <FieldError>{state?.error}</FieldError>
      {state?.success ? (
        <p className="flex items-start gap-2 rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> {state.success}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        <ShieldCheck size={15} /> {pending ? "Submitting…" : "Submit for verification"}
      </Button>
    </form>
  );
}
