type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  errors?: string[];
};

export function Field({ label, name, errors, ...input }: FieldProps) {
  const errorId = errors?.length ? `${name}-error` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-base font-semibold text-slate-900">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={errorId}
        className="min-h-12 rounded-lg border-2 border-slate-400 bg-white px-3 text-lg text-slate-950 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 aria-invalid:border-red-700"
        {...input}
      />
      {errorId && (
        <p id={errorId} className="text-sm font-medium text-red-800">
          {errors!.join(". ")}
        </p>
      )}
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
  const errorId = errors?.length ? `${name}-error` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-base font-semibold text-slate-900">
        {label}
      </label>
      <select
        id={name}
        name={name}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={errorId}
        className="min-h-12 rounded-lg border-2 border-slate-400 bg-white px-3 text-lg text-slate-950 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 aria-invalid:border-red-700"
        {...select}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {errorId && (
        <p id={errorId} className="text-sm font-medium text-red-800">
          {errors!.join(". ")}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border-2 border-red-700 bg-red-50 p-3 font-medium text-red-900"
    >
      {message}
    </p>
  );
}

export const primaryButton =
  "min-h-12 w-full rounded-lg bg-emerald-800 px-4 text-lg font-semibold text-white hover:bg-emerald-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-900 disabled:opacity-60";

export const secondaryButton =
  "min-h-12 w-full rounded-lg border-2 border-slate-800 bg-white px-4 text-lg font-semibold text-slate-900 hover:bg-slate-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-slate-900";
