"use client";

import { useActionState } from "react";
import { Field, primaryButton } from "@/components/field";
import { loginAction, type FormState } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border-2 border-red-700 bg-red-50 p-3 font-medium text-red-900"
        >
          {state.error}
        </p>
      )}
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
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
