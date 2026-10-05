import { SignOutIcon, StorefrontIcon } from "@phosphor-icons/react/ssr";
import { key } from "@/components/field";
import { getLowStock } from "@/lib/data/alerts";
import { getCurrentShop } from "@/lib/shop";
import { signOutAction } from "../(auth)/actions";
import { MainNav } from "./main-nav";

/**
 * Phones and tablets: a top bar (shop + Sign out) and the bottom nav.
 * From lg: a sticky left sidebar with brand, shop, nav and Sign out; content takes the rest.
 * Both headers are rendered; CSS shows one (display:none keeps the other out of the a11y tree).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const shop = await getCurrentShop();
  const low = await getLowStock(shop.id);
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <header
        style={{ viewTransitionName: "app-header" }}
        className="sticky top-0 z-20 border-b-2 border-line bg-paper short:static lg:hidden"
      >
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-2">
          <p className="flex min-w-0 items-center gap-2.5">
            <ShopMark />
            <span className="line-clamp-2 text-lg leading-tight font-extrabold break-words">
              {shop.name}
            </span>
          </p>
          <form action={signOutAction}>
            <button type="submit" className={key("secondary", "sm")}>
              <SignOutIcon aria-hidden weight="bold" className="size-5" />
              <span className="sr-only sm:not-sr-only">Sign out</span>
            </button>
          </form>
        </div>
      </header>

      <header
        style={{ viewTransitionName: "app-side" }}
        className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r-2 border-transparent bg-bar p-3 pt-5 text-on-bar lg:flex dark:border-line"
      >
        <div className="flex flex-col gap-3 px-2">
          <p className="stamp text-on-bar-muted">StockSense</p>
          <p className="flex items-start gap-2.5">
            <ShopMark />
            <span className="pt-1 text-lg leading-tight font-extrabold break-words">
              {shop.name}
            </span>
          </p>
        </div>
        <MainNav alertCount={low.length} variant="side" />
        <form action={signOutAction} className="mt-auto">
          <button
            type="submit"
            className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-lg font-bold text-on-bar-muted transition-colors hover:bg-on-bar/10 hover:text-on-bar focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-on-bar"
          >
            <SignOutIcon aria-hidden weight="bold" className="size-6" />
            Sign out
          </button>
        </form>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-5 pb-32 short:pb-24 lg:max-w-6xl lg:px-8 lg:pt-8 lg:pb-12 xl:px-10">
        {children}
      </main>
      <MainNav alertCount={low.length} variant="bar" />
    </div>
  );
}

function ShopMark() {
  return (
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-xl border-2 border-key-primary-edge bg-accent text-on-accent"
    >
      <StorefrontIcon weight="fill" className="size-5" />
    </span>
  );
}
