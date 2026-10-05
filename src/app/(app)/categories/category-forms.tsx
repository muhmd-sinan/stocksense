"use client";

import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Field, FormError, key, stagger } from "@/components/field";
import type { FormState } from "@/lib/form-state";
import { addCategoryAction, deleteCategoryAction, renameCategoryAction } from "./actions";

export function AddCategory() {
  const [state, action, pending] = useActionState<FormState, FormData>(addCategoryAction, {});
  return (
    <form
      key={state.ok ? "reset" : JSON.stringify(state.values)}
      action={action}
      className="flex items-end gap-3"
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
      <button type="submit" disabled={pending} className={key("primary")}>
        <PlusIcon aria-hidden weight="bold" className="size-5" />
        Add
      </button>
    </form>
  );
}

export function CategoryRow({
  index,
  id,
  name,
  itemCount,
}: {
  index: number;
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
    <li className="enter flex flex-col gap-2 px-4 py-3.5" style={stagger(index)}>
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
          <button type="submit" disabled={pending} className={key("primary", "sm")}>
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className={key("secondary", "sm")}
          >
            Cancel
          </button>
        </form>
      ) : (
        // The buttons drop under the name when the row gets too narrow for both
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="min-w-[10rem] flex-1">
            <p className="text-lg leading-snug font-bold break-words">{name}</p>
            <Link
              href={`/items?category=${id}`}
              transitionTypes={["nav-back"]}
              className="-my-3 inline-flex min-h-11 min-w-11 items-center text-sm font-semibold text-ink-2 underline decoration-2 underline-offset-4 hover:text-ink focus-visible:outline-3 focus-visible:outline-focus"
            >
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </Link>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={key("secondary", "sm")}
            >
              <PencilSimpleIcon aria-hidden weight="bold" className="size-4" />
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
              className={`${key("secondary", "sm")} text-danger`}
            >
              <TrashIcon aria-hidden weight="bold" className="size-4" />
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
