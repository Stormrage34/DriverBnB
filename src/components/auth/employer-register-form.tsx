"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { registerEmployerAction, type ActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, FieldError, Input, Label, Select } from "@/components/ui/field";
import { COMPANY_TYPES, COUNTRIES } from "@/lib/constants";

export function EmployerRegisterForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(registerEmployerAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="displayName" required>Your name</Label>
          <Input id="displayName" name="displayName" autoComplete="name" required />
          <FieldError>{state?.fieldErrors?.displayName?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="email" required>Work email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
          <FieldError>{state?.fieldErrors?.email?.[0]}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="companyLegalName" required>Registered legal name</Label>
        <Input id="companyLegalName" name="companyLegalName" placeholder="As it appears on the registration extract" required />
        <FieldError>{state?.fieldErrors?.companyLegalName?.[0]}</FieldError>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="companyCountry" required>Country of registration</Label>
          <Select id="companyCountry" name="companyCountry" defaultValue="" required>
            <option value="" disabled>Select country of registration</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </Select>
          <FieldError>{state?.fieldErrors?.companyCountry?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="companyRegistrationNumber" required>Registration number</Label>
          <Input id="companyRegistrationNumber" name="companyRegistrationNumber" placeholder="Company registration number" required />
          <FieldError>{state?.fieldErrors?.companyRegistrationNumber?.[0]}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="companyType" required>What is your role in recruitment?</Label>
        <Select id="companyType" name="companyType" defaultValue="direct_employer" required>
          {COMPANY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          Agencies, subcontractors and intermediaries must declare their role. Disguising an agency as a
          direct employer leads to suspension.
        </p>
        <FieldError>{state?.fieldErrors?.companyType?.[0]}</FieldError>
      </div>

      <div>
        <Label htmlFor="companyWebsite">Company website</Label>
        <Input id="companyWebsite" name="companyWebsite" type="url" placeholder="https://" />
        <FieldError>{state?.fieldErrors?.companyWebsite?.[0]}</FieldError>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="password" required hint="min. 10 characters">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
          <FieldError>{state?.fieldErrors?.password?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="confirmPassword" required>Confirm password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
          <FieldError>{state?.fieldErrors?.confirmPassword?.[0]}</FieldError>
        </div>
      </div>

      <Checkbox
        name="acceptTerms"
        label={
          <>
            I agree to the <Link href="/terms" className="underline underline-offset-4">terms</Link> and have read the{" "}
            <Link href="/privacy" className="underline underline-offset-4">privacy notice</Link>.
          </>
        }
      />
      <FieldError>{state?.fieldErrors?.acceptTerms?.[0]}</FieldError>
      <FieldError>{state?.error}</FieldError>

      <Button type="submit" disabled={pending} className="w-full">
        <Building2 size={15} /> {pending ? "Creating account…" : "Create employer account"}
      </Button>
      <p className="text-center text-xs text-muted">
        Next step: submit verification evidence. You can publish vacancies while unverified — they are
        clearly labelled until identity checks are complete.
      </p>
    </form>
  );
}
