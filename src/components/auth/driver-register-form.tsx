"use client";

import { useActionState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { registerDriverAction, type ActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, FieldError, Input, Label, Select } from "@/components/ui/field";
import { COUNTRIES } from "@/lib/constants";

export function DriverRegisterForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(registerDriverAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div>
        <Label htmlFor="displayName" required>Your name</Label>
        <Input id="displayName" name="displayName" autoComplete="name" required />
        <FieldError>{state?.fieldErrors?.displayName?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="email" required>Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError>{state?.fieldErrors?.email?.[0]}</FieldError>
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
      <div>
        <Label htmlFor="country">Country of residence</Label>
        <Select id="country" name="country" defaultValue="">
          <option value="">Prefer not to say</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </Select>
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
        <UserPlus size={15} /> {pending ? "Creating account…" : "Create driver account"}
      </Button>
      <p className="text-center text-xs text-muted">
        Free for drivers, always. Your profile and CV are private until you choose to share them.
      </p>
    </form>
  );
}
