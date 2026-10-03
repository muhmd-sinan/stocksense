"use client";

import { useActionState } from "react";
import { Field, FormError, SelectField, primaryButton } from "@/components/field";
import type { FormState } from "@/lib/form-state";

type Values = {
  name: string;
  categoryId: string;
  unit: string;
  price: string;
  currentStock: string;
  lowStockThreshold: string;
};

export function ItemForm({
  action,
  categories,
  initial,
  submitLabel,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  categories: { id: string; name: string }[];
  initial: Values;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  const v = { ...initial, ...state.values };
  return (
    // key forces remount so defaultValues apply after React's post-action form reset
    <form key={JSON.stringify(v)} action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError message={state.error} />
      <Field label="Name" name="name" defaultValue={v.name} errors={fe.name} required />
      <SelectField
        label="Category"
        name="categoryId"
        defaultValue={v.categoryId}
        errors={fe.categoryId}
        placeholder="Choose a category"
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        required
      />
      <Field
        label="Unit (what you count in: pack, bag, bottle, kg…)"
        name="unit"
        defaultValue={v.unit}
        errors={fe.unit}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Price (₹)"
          name="price"
          inputMode="decimal"
          defaultValue={v.price}
          errors={fe.price}
          required
        />
        <Field
          label="Stock"
          name="currentStock"
          inputMode="decimal"
          defaultValue={v.currentStock}
          errors={fe.currentStock}
          required
        />
      </div>
      <Field
        label="Alert when stock is at or below"
        name="lowStockThreshold"
        inputMode="decimal"
        defaultValue={v.lowStockThreshold}
        errors={fe.lowStockThreshold}
        required
      />
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
