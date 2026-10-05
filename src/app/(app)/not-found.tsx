import Link from "next/link";
import { key, pageTitle } from "@/components/field";
import { Screen } from "@/components/screen";

export default function NotFound() {
  return (
    <Screen>
      <h1 className={pageTitle}>Not found</h1>
      <p className="text-lg text-ink-2">This page doesn&apos;t exist, or the item was deleted.</p>
      <Link href="/items" transitionTypes={["nav-back"]} className={`${key("primary")} self-start`}>
        Back to items
      </Link>
    </Screen>
  );
}
