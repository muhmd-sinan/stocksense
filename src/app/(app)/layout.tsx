import { SignOutIcon, StorefrontIcon } from "@phosphor-icons/react/ssr";
import { key } from "@/components/field";
import { getLowStock } from "@/lib/data/alerts";
import { getCurrentShop } from "@/lib/shop";
import { signOutAction } from "../(auth)/actions";
import { BottomNav } from "./bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const shop = await getCurrentShop();
  const low = await getLowStock(shop.id);
  return (
    <>
      <header
        style={{ viewTransitionName: "app-header" }}
        className="sticky top-0 z-20 border-b-2 border-line bg-paper"
      >
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-2">
          <p className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-xl border-2 border-key-primary-edge bg-accent text-on-accent"
            >
              <StorefrontIcon weight="fill" className="size-5" />
            </span>
            <span className="truncate text-lg font-extrabold">{shop.name}</span>
          </p>
          <form action={signOutAction}>
            <button type="submit" className={key("secondary", "sm")}>
              <SignOutIcon aria-hidden weight="bold" className="size-5" />
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-5 pb-32">
        {children}
      </main>
      <BottomNav alertCount={low.length} />
    </>
  );
}
