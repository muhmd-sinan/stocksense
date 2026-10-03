import { getLowStock } from "@/lib/data/alerts";
import { getCurrentShop } from "@/lib/shop";
import { signOutAction } from "../(auth)/actions";
import { BottomNav } from "./bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const shop = await getCurrentShop();
  const low = await getLowStock(shop.id);
  return (
    <>
      <header className="sticky top-0 z-10 border-b-2 border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-2">
          <p className="truncate text-lg font-bold text-emerald-900">{shop.name}</p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="min-h-11 rounded-lg px-3 font-semibold text-slate-800 underline underline-offset-2 hover:bg-slate-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 pt-5 pb-28">
        {children}
      </main>
      <BottomNav alertCount={low.length} />
    </>
  );
}
