import { WarningCircleIcon } from "@phosphor-icons/react/ssr";

/*
  Shared control styles. Shape rule: controls and panels are rounded-xl (12px), tags are pills.
  Keys (buttons) sit on a hard base shadow and press down into it on tap, like a register key.
  Hover lift only applies on devices that can hover (Tailwind v4 wraps hover in @media (hover)).
*/

type KeyTone = "primary" | "secondary" | "danger";
type KeySize = "md" | "sm";

const keyTone: Record<KeyTone, string> = {
  primary: "[--kb:var(--key-primary-base)] border-key-primary-edge bg-accent text-on-accent",
  secondary: "[--kb:var(--key-base)] border-key-edge bg-surface text-ink",
  danger: "[--kb:var(--key-danger-base)] border-(--key-danger-base) bg-danger text-on-solid",
};

const keySize: Record<KeySize, string> = {
  md: "min-h-12 px-5 text-lg shadow-[0_4px_0_0_var(--kb)] hover:shadow-[0_5px_0_0_var(--kb)] active:translate-y-1 disabled:translate-y-1",
  sm: "min-h-11 px-3 text-base shadow-[0_3px_0_0_var(--kb)] hover:shadow-[0_4px_0_0_var(--kb)] active:translate-y-[3px] disabled:translate-y-[3px]",
};

export function key(tone: KeyTone = "secondary", size: KeySize = "md"): string {
  return [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border-2 font-bold whitespace-nowrap select-none",
    "transition-[translate,box-shadow] duration-100 ease-out motion-reduce:transition-none",
    "hover:-translate-y-px active:shadow-none",
    "focus-visible:outline-3 focus-visible:outline-offset-[3px] focus-visible:outline-focus",
    "disabled:pointer-events-none disabled:opacity-70 disabled:shadow-none",
    keyTone[tone],
    keySize[size],
  ].join(" ");
}

export const primaryButton = `${key("primary")} w-full`;
export const secondaryButton = `${key("secondary")} w-full`;
export const dangerButton = `${key("danger")} w-full`;

export const inputClass =
  "min-h-12 w-full rounded-xl border-2 border-edge bg-surface px-3 text-lg text-ink placeholder:text-ink-2 focus:outline-3 focus:outline-offset-2 focus:outline-focus aria-invalid:border-danger aria-invalid:bg-danger-soft";

export const labelClass = "text-base font-bold text-ink";

export const pageTitle = "headline text-4xl text-balance text-ink";

/** Underlined text link; the underline thickens on hover/focus */
export const textLink =
  "font-bold text-ink underline decoration-2 underline-offset-4 hover:decoration-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus rounded-sm";

export const tagClass = {
  base: "stamp inline-flex items-center gap-1 rounded-full px-2 py-1",
  sale: "bg-ink text-paper",
  restock: "bg-ok text-on-solid",
  alert: "bg-accent text-on-accent",
  create: "bg-surface text-ink ring-2 ring-edge ring-inset",
  danger: "bg-danger text-on-solid",
};

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  hint?: string;
  errors?: string[];
};

function describedBy(name: string, hint?: string, errors?: string[]) {
  const ids = [hint && `${name}-hint`, errors?.length && `${name}-error`].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

function FieldMessages({ name, hint, errors }: { name: string; hint?: string; errors?: string[] }) {
  return (
    <>
      {hint && (
        <p id={`${name}-hint`} className="text-sm text-ink-2">
          {hint}
        </p>
      )}
      {errors?.length ? (
        <p id={`${name}-error`} className="text-sm font-bold text-danger">
          {errors.join(". ")}
        </p>
      ) : null}
    </>
  );
}

export function Field({ label, name, hint, errors, ...input }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy(name, hint, errors)}
        className={inputClass}
        {...input}
      />
      <FieldMessages name={name} hint={hint} errors={errors} />
    </div>
  );
}

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  name: string;
  errors?: string[];
  options: { value: string; label: string }[];
  placeholder?: string;
};

export function SelectField({
  label,
  name,
  errors,
  options,
  placeholder,
  ...select
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy(name, undefined, errors)}
        className={inputClass}
        {...select}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldMessages name={name} errors={errors} />
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="enter flex items-start gap-2 rounded-xl border-2 border-danger bg-danger-soft p-3 font-semibold text-ink"
    >
      <WarningCircleIcon aria-hidden weight="bold" className="mt-0.5 size-5 shrink-0 text-danger" />
      <span>{message}</span>
    </p>
  );
}

/** Three pulsing dots for "working" states; pair with visible text like "Saving" */
export function Dots() {
  return (
    <span aria-hidden className="dots">
      <span />
      <span />
      <span />
    </span>
  );
}

/** Index for the CSS `enter` stagger (see globals.css) */
export function stagger(i: number): React.CSSProperties {
  return { "--i": i } as React.CSSProperties;
}
