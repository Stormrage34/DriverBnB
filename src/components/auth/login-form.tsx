"use client";

import { useActionState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { loginAction, type ActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(loginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div>
        <Label htmlFor="email" required>Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError>{state?.fieldErrors?.email?.[0]}</FieldError>
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="password" required>Password</Label>
          <Link href="/forgot-password" className="text-xs font-medium text-brand underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
        <FieldError>{state?.fieldErrors?.password?.[0]}</FieldError>
      </div>
      <FieldError>{state?.error}</FieldError>
      <Button type="submit" disabled={pending} className="w-full">
        <LogIn size={15} /> {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="font-medium text-brand underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
