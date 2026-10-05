import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, googleEnabled } from "@/auth";
import { secondaryButton, textLink } from "@/components/field";
import { Screen } from "@/components/screen";
import { googleLoginAction } from "../actions";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if ((await auth())?.user) redirect("/");
  return (
    <Screen>
      <h1 className="headline text-3xl">Sign in</h1>
      <LoginForm />
      {googleEnabled && (
        <form action={googleLoginAction}>
          <button type="submit" className={secondaryButton}>
            Continue with Google
          </button>
        </form>
      )}
      <p className="text-ink-2">
        New here?{" "}
        <Link href="/signup" transitionTypes={["nav-forward"]} className={textLink}>
          Create your shop
        </Link>
      </p>
    </Screen>
  );
}
