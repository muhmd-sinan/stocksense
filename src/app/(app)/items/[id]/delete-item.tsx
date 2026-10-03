"use client";

import { useState, useTransition } from "react";
import { FormError } from "@/components/field";
import type { FormState } from "@/lib/form-state";

export function DeleteItem({ name, action }: { name: string; action: () => Promise<FormState> }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  if (!confirming)
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-12 rounded-lg border-2 border-red-800 px-4 text-lg font-semibold text-red-900 hover:bg-red-50"
      >
        Delete item
      </button>
    );

  return (
    <div
      role="alertdialog"
      aria-labelledby="del-title"
      className="flex flex-col gap-3 rounded-lg border-2 border-red-800 bg-red-50 p-4"
    >
      <p id="del-title" className="font-semibold text-red-950">
        Delete {name}? It will be hidden from your lists. Past sales stay in your reports.
      </p>
      <FormError message={error} />
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          autoFocus
          onClick={() => setConfirming(false)}
          className="min-h-12 rounded-lg border-2 border-slate-800 bg-white font-semibold text-slate-900"
        >
          Keep it
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await action();
              if (res?.error) setError(res.error);
            })
          }
          className="min-h-12 rounded-lg bg-red-800 font-semibold text-white hover:bg-red-900 disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
      </div>
    </div>
  );
}
