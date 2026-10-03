export type FormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  // Echoed back so fields survive React's post-action form reset. Never includes passwords.
  values?: Record<string, string>;
};

export function formValues(fd: FormData, keys: readonly string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(fd.get(k) ?? "")]));
}
