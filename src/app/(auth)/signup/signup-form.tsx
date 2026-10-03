"use client";

import { useActionState } from "react";
import { Field, primaryButton } from "@/components/field";
import { signupAction, type FormState } from "../actions";

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signupAction, {});
  const fe = state.fieldErrors ?? {};
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
        label="Shop name"
        name="shopName"
        autoComplete="organization"
        required
        errors={fe.shopName}
        defaultValue={state.values?.shopName}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        errors={fe.email}
        defaultValue={state.values?.email}
      />
      <Field
        label="Password (8+ characters)"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        errors={fe.password}
      />
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Creating…" : "Create shop"}
      </button>
    </form>
  );
}
