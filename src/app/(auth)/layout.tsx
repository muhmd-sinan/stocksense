import { StorefrontIcon } from "@phosphor-icons/react/ssr";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-10">
      {/* The shop signboard */}
      <div className="enter flex flex-col gap-4 rounded-xl border-2 border-key-primary-edge bg-accent p-6 text-on-accent">
        <span
          aria-hidden
          className="grid size-12 place-items-center rounded-xl bg-on-accent text-accent"
        >
          <StorefrontIcon weight="fill" className="size-7" />
        </span>
        <p className="headline text-[clamp(2.25rem,10vw,3rem)]">StockSense</p>
        <p className="text-lg font-semibold">
          Type what you sold or received. Stock updates when you confirm.
        </p>
      </div>
      {children}
    </main>
  );
}
