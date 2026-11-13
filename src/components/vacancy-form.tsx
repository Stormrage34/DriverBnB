"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Save, Send } from "lucide-react";
import { saveVacancyAction, type EmployerActionState } from "@/app/employer/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, FieldError, HelpText, Input, Label, Select, Textarea } from "@/components/ui/field";
import {
  ACCOMMODATION_OPTIONS,
  APPLICATION_METHODS,
  CONTRACT_TYPES,
  COUNTRIES,
  LOADING_OPTIONS,
  PAY_PERIODS,
  TRANSPORT_CATEGORIES,
} from "@/lib/constants";
import type { Vacancy } from "@/db/schema";

export function VacancyForm({
  vacancy,
  defaultContractingEntity,
  defaultCountry,
}: {
  vacancy?: Vacancy;
  defaultContractingEntity: string;
  defaultCountry: string;
}) {
  const [state, formAction, pending] = useActionState<EmployerActionState, FormData>(saveVacancyAction, null);
  const [method, setMethod] = useState(vacancy?.applicationMethod ?? "platform_message");
  const [publish, setPublish] = useState(
    vacancy ? ["confirmed", "published_verified", "published_unverified"].includes(vacancy.status) : false,
  );

  const allowanceText =
    vacancy?.allowances
      .map((a) => [a.label, a.amount ?? "", a.note ?? ""].join(" | ").replace(/ \| $/, ""))
      .join("\n") ?? "";

  return (
    <form action={formAction} className="space-y-4">
      {vacancy ? <input type="hidden" name="vacancyId" value={vacancy.id} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Role</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="title" required>Job title</Label>
            <Input id="title" name="title" defaultValue={vacancy?.title ?? ""} placeholder="International C+E reefer driver" required />
          </div>
          <div>
            <Label htmlFor="country" required>Employment country</Label>
            <Select id="country" name="country" defaultValue={vacancy?.country ?? defaultCountry} required>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="city">City / operating base</Label>
            <Input id="city" name="city" defaultValue={vacancy?.city ?? ""} placeholder="Rotterdam" />
          </div>
          <div>
            <Label htmlFor="transportCategory" required>Transport category</Label>
            <Select id="transportCategory" name="transportCategory" defaultValue={vacancy?.transportCategory ?? "reefer"}>
              {TRANSPORT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="contractType" required>Contract type</Label>
            <Select id="contractType" name="contractType" defaultValue={vacancy?.contractType ?? "permanent"}>
              {CONTRACT_TYPES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="contractingEntity" required>Contracting legal entity</Label>
            <Input
              id="contractingEntity"
              name="contractingEntity"
              defaultValue={vacancy?.contractingEntity ?? defaultContractingEntity}
              required
            />
            <HelpText>Shown to drivers. Must be the entity that signs the employment contract.</HelpText>
          </div>
          <div>
            <Label htmlFor="licenceRequirements" hint="comma separated">Licence requirements</Label>
            <Input id="licenceRequirements" name="licenceRequirements" defaultValue={vacancy?.licenceRequirements.join(", ") ?? "C+E"} placeholder="C+E, Code 95, ADR" />
          </div>
          <div>
            <Label htmlFor="experienceRequirements">Experience required</Label>
            <Input id="experienceRequirements" name="experienceRequirements" defaultValue={vacancy?.experienceRequirements ?? ""} placeholder="2 years international driving" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pay</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="grossPayMin" hint="EUR">Gross minimum</Label>
            <Input id="grossPayMin" name="grossPayMin" type="number" min={0} step={50} defaultValue={vacancy?.grossPayMin ?? ""} placeholder="2800" />
          </div>
          <div>
            <Label htmlFor="grossPayMax" hint="optional">Gross maximum</Label>
            <Input id="grossPayMax" name="grossPayMax" type="number" min={0} step={50} defaultValue={vacancy?.grossPayMax ?? ""} placeholder="3200" />
          </div>
          <div>
            <Label htmlFor="payPeriod" required>Pay period</Label>
            <Select id="payPeriod" name="payPeriod" defaultValue={vacancy?.payPeriod ?? "month"}>
              {PAY_PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="payStructure">How is pay built up?</Label>
            <Textarea
              id="payStructure"
              name="payStructure"
              rows={4}
              defaultValue={vacancy?.payStructure ?? ""}
              placeholder="Basic monthly salary, paid 12 times per year, plus €X net per night out. Overtime after 40 hours at 125%. Holiday allowance 8% accrued monthly."
            />
            <HelpText>State the components separately. Never present gross as net.</HelpText>
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="allowances" hint="one per line">Allowances & extras</Label>
            <Textarea
              id="allowances"
              name="allowances"
              rows={3}
              defaultValue={allowanceText}
              placeholder={"Night-out allowance | 55 | net per night\nTravel allowance | 150 | monthly"}
            />
            <HelpText>Format: Label | amount in EUR | optional note. Leave the amount blank for non-cash items.</HelpText>
          </div>
          <div className="sm:col-span-3 rounded-xl bg-paper p-3 text-xs leading-relaxed text-muted">
            Gross salary is mandatory before publishing. Deductions and net estimates must be labelled as such.
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Working pattern & rest</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="workingPattern">Working pattern</Label>
            <Input id="workingPattern" name="workingPattern" defaultValue={vacancy?.workingPattern ?? ""} placeholder="International tramping, Mon–Fri" />
          </div>
          <div>
            <Label htmlFor="rotation">Rotation</Label>
            <Input id="rotation" name="rotation" defaultValue={vacancy?.rotation ?? ""} placeholder="3 weeks out / 1 week home" />
          </div>
          <div>
            <Label htmlFor="homeTime">Home time</Label>
            <Input id="homeTime" name="homeTime" defaultValue={vacancy?.homeTime ?? ""} placeholder="Weekends at home, 2–3 days per rotation" />
          </div>
          <div>
            <Label htmlFor="weeklyRest">Weekly rest arrangements</Label>
            <Input id="weeklyRest" name="weeklyRest" defaultValue={vacancy?.weeklyRest ?? ""} placeholder="Truck parked at depot; hotel provided for 45h rest" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="accommodation" required>Accommodation</Label>
            <Select id="accommodation" name="accommodation" defaultValue={vacancy?.accommodation ?? "not_disclosed"}>
              {ACCOMMODATION_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </Select>
            <HelpText>“Not disclosed” blocks publication: drivers need this answer.</HelpText>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="accommodationDetails">Accommodation details</Label>
            <Input id="accommodationDetails" name="accommodationDetails" defaultValue={vacancy?.accommodationDetails ?? ""} placeholder="Shared apartment, €350/month deducted, single room" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Duties, vehicle & routes</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="loadingUnloading" required>Loading / unloading</Label>
            <Select id="loadingUnloading" name="loadingUnloading" defaultValue={vacancy?.loadingUnloading ?? "none"}>
              {LOADING_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="vehicleType">Vehicle</Label>
            <Input id="vehicleType" name="vehicleType" defaultValue={vacancy?.vehicleType ?? ""} placeholder="Volvo FH 2022, 4x2" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="equipment">Equipment details</Label>
            <Textarea id="equipment" name="equipment" rows={3} defaultValue={vacancy?.equipment ?? ""} placeholder="Thermoking SLXi, tail lift, pallet truck, ADR kit" />
          </div>
          <div>
            <Label htmlFor="operatingCountries" hint="comma separated">Operating countries</Label>
            <Input id="operatingCountries" name="operatingCountries" defaultValue={vacancy?.operatingCountries.join(", ") ?? ""} placeholder="NL, BE, DE, DK" />
          </div>
          <div>
            <Label htmlFor="languagesRequired" hint="comma separated">Languages required</Label>
            <Input id="languagesRequired" name="languagesRequired" defaultValue={vacancy?.languagesRequired.join(", ") ?? ""} placeholder="English, Dutch" />
          </div>
          <div>
            <Label htmlFor="trainingProvided">Training provided</Label>
            <Input id="trainingProvided" name="trainingProvided" defaultValue={vacancy?.trainingProvided ?? ""} placeholder="ADR refresher, company induction" />
          </div>
          <div>
            <Label htmlFor="benefits">Benefits</Label>
            <Input id="benefits" name="benefits" defaultValue={vacancy?.benefits ?? ""} placeholder="Pension, health insurance, fuel card" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How drivers apply</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="applicationMethod" required>Application method</Label>
            <Select
              id="applicationMethod"
              name="applicationMethod"
              value={method}
              onChange={(event) => setMethod(event.target.value as typeof method)}
            >
              {APPLICATION_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
          </div>
          {method === "external_link" ? (
            <div className="sm:col-span-2">
              <Label htmlFor="applicationUrl" required>Application URL</Label>
              <Input id="applicationUrl" name="applicationUrl" type="url" defaultValue={vacancy?.applicationUrl ?? ""} placeholder="https://your-company.example/careers/driver" />
            </div>
          ) : null}
          {method === "email" ? (
            <div className="sm:col-span-2">
              <Label htmlFor="applicationEmail" required>Recruitment email</Label>
              <Input id="applicationEmail" name="applicationEmail" type="email" defaultValue={vacancy?.applicationEmail ?? ""} placeholder="recruitment@your-company.example" />
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <Label htmlFor="contactName">Contact person</Label>
            <Input id="contactName" name="contactName" defaultValue={vacancy?.contactName ?? ""} placeholder="Name shown to drivers" />
          </div>
        </CardBody>
      </Card>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <Checkbox
          name="intendToPublish"
          label="Publish this vacancy now"
          hint="Publishing requires gross pay, pay structure, rotation, home time, weekly rest, accommodation, licence requirements and an application method."
          checked={publish}
          onChange={(event) => setPublish(event.target.checked)}
        />
        {publish ? (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-xs leading-relaxed text-ink-soft">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-warning" />
            You are confirming this role is genuinely open. Reconfirm it every 30 days or it will be flagged
            as overdue.
          </p>
        ) : null}
        <FieldError>{state?.error}</FieldError>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {publish ? <Send size={15} /> : <Save size={15} />}
          {pending ? "Saving…" : publish ? "Publish vacancy" : "Save draft"}
        </Button>
        <p className="text-xs text-muted">
          {vacancy
            ? `Current status: ${vacancy.status.replaceAll("_", " ")}`
            : "Drafts are private and can be completed later."}
        </p>
      </div>
    </form>
  );
}
