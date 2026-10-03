"use server";

import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createShopForUser } from "@/lib/onboarding";
import { hashPassword } from "@/lib/password";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  // Echoed back so fields survive React's post-action form reset. Never includes the password.
  values?: Record<string, string>;
};

const signupSchema = z.object({
  shopName: z.string().trim().min(2, "Shop name is too short").max(80),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Use at least 8 characters").max(128),
});

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    shopName: String(formData.get("shopName") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const { shopName, email, password } = parsed.data;

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing)
    return { fieldErrors: { email: ["An account with this email already exists"] }, values };

  const passwordHash = await hashPassword(password);
  try {
    await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ email, passwordHash }).returning();
      await createShopForUser(user.id, shopName, tx);
    });
  } catch (e) {
    // Unique violation from a concurrent signup with the same email
    if ((e as { code?: string }).code === "23505")
      return { fieldErrors: { email: ["An account with this email already exists"] }, values };
    return { error: "Could not create your account. Please try again.", values };
  }

  // Throws a redirect on success, which must propagate
  await signIn("credentials", { email, password, redirectTo: "/" });
  return {};
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
    return {};
  } catch (e) {
    if (e instanceof AuthError)
      return {
        error: "Wrong email or password",
        values: { email: String(formData.get("email") ?? "") },
      };
    throw e; // redirect
  }
}

export async function googleLoginAction() {
  await signIn("google", { redirectTo: "/" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
