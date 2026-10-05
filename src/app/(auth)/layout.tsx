import { StorefrontIcon } from "@phosphor-icons/react/ssr";

/** Phones: signboard above the form. From lg: signboard | form, side by side. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto grid w-full max-w-md flex-1 content-center gap-8 px-5 py-10 lg:max-w-5xl lg:grid-cols-2 lg:items-stretch lg:gap-12 lg:px-8">
      {/* The shop signboard */}
      <div className="enter flex flex-col gap-4 rounded-xl border-2 border-key-primary-edge bg-accent p-6 text-on-accent lg:min-h-[28rem] lg:justify-between lg:p-10">
        <span
          aria-hidden
          className="grid size-12 place-items-center rounded-xl bg-on-accent text-accent lg:size-16"
        >
          <StorefrontIcon weight="fill" className="size-7 lg:size-9" />
        </span>
        <p className="headline text-[clamp(2rem,9vw,3rem)]">StockSense</p>
      </div>
      <div className="lg:self-center">{children}</div>
    </main>
  );
}
