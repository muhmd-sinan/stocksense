"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Field, FormError } from "@/components/field";
import type { FormState } from "@/lib/form-state";
import { addCategoryAction, deleteCategoryAction, renameCategoryAction } from "./actions";

const smallBtn =
  "min-h-11 rounded-lg border-2 border-slate-800 bg-white px-3 font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60";

export function AddCategory() {
  const [state, action, pending] = useActionState<FormState, FormData>(addCategoryAction, {});
  return (
    <form
      key={state.ok ? "reset" : JSON.stringify(state.values)}
      action={action}
      className="flex items-end gap-2"
      noValidate
    >
      <div className="flex-1">
        <Field
          label="New category"
          name="name"
          defaultValue={state.ok ? "" : state.values?.name}
          errors={state.fieldErrors?.name}
          required
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-lg bg-emerald-800 px-4 text-lg font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
      >
        Add
      </button>
    </form>
  );
}

export function CategoryRow({
  id,
  name,
  itemCount,
}: {
  id: string;
  name: string;
  itemCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, startDelete] = useTransition();
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const res = await renameCategoryAction(id, prev, fd);
    if (res.ok) setEditing(false);
    return res;
  }, {});

  return (
    <li className="flex flex-col gap-2 rounded-lg border-2 border-slate-200 bg-white p-4">
      {editing ? (
        <form action={action} className="flex items-end gap-2" noValidate>
          <div className="flex-1">
            <Field
              label={`Rename ${name}`}
              name="name"
              defaultValue={state.values?.name ?? name}
              errors={state.fieldErrors?.name}
              autoFocus
              required
            />
          </div>
          <button type="submit" disabled={pending} className={smallBtn}>
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className={smallBtn}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-lg font-semibold text-slate-950">{name}</p>
            <Link
              href={`/items?category=${id}`}
              className="text-sm text-emerald-800 underline underline-offset-2"
            >
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </Link>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className={smallBtn}>
              Rename
            </button>
            <button
              type="button"
              disabled={deleting || itemCount > 0}
              title={itemCount > 0 ? "Move or delete its items first" : undefined}
              onClick={() =>
                startDelete(async () => {
                  if (!window.confirm(`Delete category ${name}?`)) return;
                  const res = await deleteCategoryAction(id);
                  setDeleteError(res.error);
                })
              }
              className={`${smallBtn} border-red-800 text-red-900`}
            >
              Delete
            </button>
          </div>
        </div>
      )}
      <FormError message={state.error ?? deleteError} />
      {itemCount > 0 && !editing && (
        <p className="sr-only">Delete is unavailable while this category has items.</p>
      )}
    </li>
  );
}
