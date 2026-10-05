import { StorefrontIcon } from "@phosphor-icons/react/ssr";
import { stagger } from "@/components/field";

/**
 * Phones: a slim signboard strip (icon + wordmark on one row) above the form.
 * From lg: signboard | form. The wordmark is the sign: "Stock / Sense" stacked and sized to the
 * panel's width (container units), so the panel is filled by lettering rather than empty yellow.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto grid w-full max-w-md flex-1 content-center gap-8 px-5 py-10 lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-stretch lg:gap-12 lg:px-8">
      {/* The shop signboard */}
      <div className="enter flex items-center gap-4 rounded-xl border-2 border-key-primary-edge bg-accent p-5 text-on-accent lg:flex-col lg:items-stretch lg:justify-between lg:gap-10 lg:p-10">
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-xl bg-on-accent text-accent lg:size-16"
        >
          <StorefrontIcon weight="fill" className="size-7 lg:size-9" />
        </span>
        {/* "Sense" is the widest word: 3.38em in Archivo at headline settings, 6.54em for the
            whole name on one line. 14.5cqi / 28cqi fill the box and leave room for the fallback font before Archivo loads. */}
        <div className="@container min-w-0 flex-1 lg:flex-none">
          <p className="headline text-[length:14.5cqi] whitespace-nowrap lg:text-[length:28cqi] lg:leading-[0.86]">
            <span className="enter inline-block lg:block" style={stagger(1)}>
              Stock
            </span>
            <span className="enter inline-block lg:block" style={stagger(2)}>
              Sense
            </span>
          </p>
        </div>
      </div>
      <div className="lg:self-center">{children}</div>
    </main>
  );
}
