import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  if ((await auth())?.user) redirect("/");
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-950">Create your shop</h1>
      <SignupForm />
      <p className="text-base text-slate-800">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-emerald-800 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </>
  );
}
