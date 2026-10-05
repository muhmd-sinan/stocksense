import { Screen } from "./screen";

// Skeletons shaped like the real screens, shown by loading.tsx while data loads.
// Screen readers get one "Loading" status; the shapes themselves are hidden.

function Loading() {
  return (
    <p role="status" className="sr-only">
      Loading
    </p>
  );
}

function Title({ width = "w-40" }: { width?: string }) {
  return <div className={`skeleton h-10 ${width}`} />;
}

function Rows({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col divide-y-2 divide-line overflow-hidden rounded-xl border-2 border-line bg-surface">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 p-4">
          <div className="flex flex-1 flex-col gap-2">
            <div className="skeleton h-5 w-3/5" />
            <div className="skeleton h-4 w-2/5" />
          </div>
          <div className="skeleton h-8 w-14" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 6, tools = true }: { rows?: number; tools?: boolean }) {
  return (
    <Screen>
      <Loading />
      <div aria-hidden className="flex flex-col gap-5">
        <Title />
        {tools && <div className="skeleton h-12 w-full rounded-xl" />}
        <Rows rows={rows} />
      </div>
    </Screen>
  );
}

export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <Screen>
      <Loading />
      <div aria-hidden className="flex flex-col gap-5">
        <div className="skeleton h-5 w-20" />
        <Title width="w-56" />
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-12 w-full rounded-xl" />
          </div>
        ))}
        <div className="skeleton h-12 w-full rounded-xl" />
      </div>
    </Screen>
  );
}

export function EntrySkeleton() {
  return (
    <Screen>
      <Loading />
      <div aria-hidden className="flex flex-col gap-5">
        <Title width="w-32" />
        <div className="skeleton h-6 w-4/5" />
        <div className="skeleton h-36 w-full rounded-xl" />
        <div className="flex flex-wrap gap-2">
          {["w-40", "w-28", "w-36", "w-44"].map((w) => (
            <div key={w} className={`skeleton h-11 rounded-full ${w}`} />
          ))}
        </div>
        <div className="skeleton h-12 w-full rounded-xl" />
      </div>
    </Screen>
  );
}

export function InsightsSkeleton() {
  return (
    <Screen>
      <Loading />
      <div aria-hidden className="flex flex-col gap-5">
        <Title />
        <div className="skeleton h-12 w-full rounded-xl" />
        <div className="skeleton h-44 w-full rounded-xl" />
        <div className="skeleton h-6 w-1/2" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    </Screen>
  );
}
