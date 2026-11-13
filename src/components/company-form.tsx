"use client";

import { useActionState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { updateCompanyAction, type EmployerActionState } from "@/app/employer/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, FieldError, HelpText, Input, Label, Select, Textarea } from "@/components/ui/field";
import { COMPANY_TYPES, COUNTRIES } from "@/lib/constants";
import type { Company } from "@/db/schema";

export function CompanyForm({ company }: { company: Company }) {
  const [state, formAction, pending] = useActionState<EmployerActionState, FormData>(updateCompanyAction, null);
  const hasVerification = company.verificationStatus !== "unverified";

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Legal identity</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          {hasVerification ? (
            <div className="sm:col-span-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-xs leading-relaxed text-ink-soft">
              <strong className="text-ink">Changing verified identity removes the badge.</strong> Legal
              name, trading name, country, registration number, registered address and contracting entity
              reset identity and role checks. Changing employer classification or the direct-recruitment
              declaration resets the role check. You must tick the confirmation box before saving.
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <Label htmlFor="legalName" required hint="identity">Registered legal name</Label>
            <Input id="legalName" name="legalName" defaultValue={company.legalName} required />
          </div>
          <div>
            <Label htmlFor="tradingName" hint="identity">Trading name</Label>
            <Input id="tradingName" name="tradingName" defaultValue={company.tradingName ?? ""} />
          </div>
          <div>
            <Label htmlFor="country" required hint="identity">Country of registration</Label>
            <Select id="country" name="country" defaultValue={company.country} required>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="registrationNumber" required hint="identity">Registration number</Label>
            <Input
              id="registrationNumber"
              name="registrationNumber"
              defaultValue={company.registrationNumber ?? ""}
              required
            />
            <HelpText>Changing this requires re-verification.</HelpText>
          </div>
          <div>
            <Label htmlFor="companyType" required hint="classification">Employer classification</Label>
            <Select id="companyType" name="companyType" defaultValue={company.companyType}>
              {COMPANY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </Select>
            <HelpText>Drivers filter by this. Changing it resets the role check.</HelpText>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="registeredAddress" hint="identity">Registered business address</Label>
            <Input id="registeredAddress" name="registeredAddress" defaultValue={company.registeredAddress ?? ""} />
          </div>
          <div>
            <Label htmlFor="website">Official website</Label>
            <Input id="website" name="website" type="url" defaultValue={company.website ?? ""} placeholder="https://" />
          </div>
          <div>
            <Label htmlFor="businessEmail">Business email</Label>
            <Input id="businessEmail" name="businessEmail" type="email" defaultValue={company.businessEmail ?? ""} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={company.phone ?? ""} />
          </div>
          <div>
            <Label htmlFor="contactPerson">Recruitment contact person</Label>
            <Input id="contactPerson" name="contactPerson" defaultValue={company.contactPerson ?? ""} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operations</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="sectors" hint="comma separated">Transport sectors</Label>
            <Input id="sectors" name="sectors" defaultValue={company.sectors.join(", ")} placeholder="Refrigerated, ADR tanker, Container" />
          </div>
          <div>
            <Label htmlFor="fleetSize">Fleet size</Label>
            <Input id="fleetSize" name="fleetSize" type="number" min={0} defaultValue={company.fleetSize ?? ""} />
          </div>
          <div>
            <Label htmlFor="contractingEntity" hint="identity">Contracting legal entity</Label>
            <Input id="contractingEntity" name="contractingEntity" defaultValue={company.contractingEntity ?? ""} />
            <HelpText>The entity that signs employment contracts for your vacancies. Changing it resets verification.</HelpText>
          </div>
          <div className="flex flex-col gap-2">
            <Checkbox name="operatesOwnFleet" label="We operate our own fleet" defaultChecked={company.operatesOwnFleet} />
            <Checkbox name="recruitsDirectly" label="We recruit directly for our own company" defaultChecked={company.recruitsDirectly} />
            <HelpText>Operational changes are audited. Classification changes reset the role check.</HelpText>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Company description</Label>
            <Textarea
              id="description"
              name="description"
              rows={6}
              defaultValue={company.description ?? ""}
              placeholder="What you transport, where you operate, fleet and equipment, how dispatch works. Facts, not slogans."
            />
            <HelpText>Maximum 4,000 characters. This is employer-provided information, not verified fact.</HelpText>
          </div>
        </CardBody>
      </Card>

      <FieldError>{state?.error}</FieldError>
      {hasVerification ? (
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <Checkbox
            name="confirmIdentityChange"
            label="I understand that changing identity or classification removes the verified badge and requires re-verification."
          />
        </div>
      ) : null}
      {state?.success ? (
        <p className="flex items-center gap-2 rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
          <CheckCircle2 size={15} /> {state.success}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        <Save size={15} /> {pending ? "Saving…" : "Save company profile"}
      </Button>
    </form>
  );
}
