export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-5 py-10">
      <p className="text-3xl font-extrabold tracking-tight text-emerald-900">StockSense</p>
      {children}
    </main>
  );
}
