/** Expected, user-facing failure from the data layer. `field` maps it onto a form input. */
export class DataError extends Error {
  field: string | null;
  constructor(field: string | null, message: string) {
    super(message);
    this.name = "DataError";
    this.field = field;
  }
}

/** Postgres error code, whether thrown directly or wrapped by Drizzle (`cause`). */
export function pgCode(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code ?? err?.cause?.code;
}

export const isUniqueViolation = (e: unknown) => pgCode(e) === "23505";
export const isCheckViolation = (e: unknown) => pgCode(e) === "23514";
