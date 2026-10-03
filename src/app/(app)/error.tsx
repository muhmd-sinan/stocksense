"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border-2 border-red-700 bg-red-50 p-4"
    >
      <p className="text-lg font-semibold text-red-950">Something went wrong.</p>
      <p className="text-red-900">Check your connection and try again.</p>
      <button
        type="button"
        onClick={reset}
        className="min-h-12 rounded-lg bg-red-800 px-4 font-semibold text-white"
      >
        Try again
      </button>
    </div>
  );
}
