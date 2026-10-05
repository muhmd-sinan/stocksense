"use client";

import { TrashIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { Dots, FormError, dangerButton, key, secondaryButton } from "@/components/field";
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
        className={`${key("secondary")} self-start text-danger`}
      >
        <TrashIcon aria-hidden weight="bold" className="size-5" />
        Delete item
      </button>
    );

  return (
    <div
      role="alertdialog"
      aria-labelledby="del-title"
      className="enter flex flex-col gap-4 rounded-xl border-2 border-danger bg-danger-soft p-4"
    >
      <p id="del-title" className="font-bold text-ink">
        Delete {name}? It will be hidden from your lists. Past sales stay in your reports.
      </p>
      <FormError message={error} />
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          autoFocus
          onClick={() => setConfirming(false)}
          className={secondaryButton}
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
          className={dangerButton}
        >
          {pending ? (
            <>
              Deleting <Dots />
            </>
          ) : (
            "Yes, delete"
          )}
        </button>
      </div>
    </div>
  );
}
