import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { textLink } from "@/components/field";
import { Screen } from "@/components/screen";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  if ((await auth())?.user) redirect("/");
  return (
    <Screen>
      <h1 className="headline text-3xl">Create your shop</h1>
      <SignupForm />
      <p className="text-ink-2">
        Already have an account?{" "}
        <Link href="/login" transitionTypes={["nav-back"]} className={textLink}>
          Sign in
        </Link>
      </p>
    </Screen>
  );
}
