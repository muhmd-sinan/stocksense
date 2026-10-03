import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, googleEnabled } from "@/auth";
import { secondaryButton } from "@/components/field";
import { googleLoginAction } from "../actions";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if ((await auth())?.user) redirect("/");
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-950">Sign in</h1>
      <LoginForm />
      {googleEnabled && (
        <form action={googleLoginAction}>
          <button type="submit" className={secondaryButton}>
            Continue with Google
          </button>
        </form>
      )}
      <p className="text-base text-slate-800">
        New here?{" "}
        <Link
          href="/signup"
          className="font-semibold text-emerald-800 underline underline-offset-2"
        >
          Create your shop
        </Link>
      </p>
    </>
  );
}
