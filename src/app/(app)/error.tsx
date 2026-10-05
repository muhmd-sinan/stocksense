"use client";

import { WarningIcon } from "@phosphor-icons/react";
import { key } from "@/components/field";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div
      role="alert"
      className="enter flex flex-col items-start gap-3 rounded-xl border-2 border-danger bg-danger-soft p-5"
    >
      <WarningIcon aria-hidden weight="fill" className="size-10 text-danger" />
      <p className="text-xl font-extrabold text-ink">Something went wrong.</p>
      <p className="text-ink">Check your connection and try again.</p>
      <button type="button" onClick={reset} className={key("danger")}>
        Try again
      </button>
    </div>
  );
}
