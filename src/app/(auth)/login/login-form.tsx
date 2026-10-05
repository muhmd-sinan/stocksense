"use client";

import { useActionState } from "react";
import { Dots, Field, FormError, primaryButton } from "@/components/field";
import { loginAction, type FormState } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormError message={state.error} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <button type="submit" disabled={pending} className={`${primaryButton} mt-2`}>
        {pending ? (
          <>
            Signing in <Dots />
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
