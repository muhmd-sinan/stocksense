import { ViewTransition } from "react";

/**
 * Wraps one screen's content so navigation animates (styles in globals.css):
 * - tab links tagged nav-forward / nav-back slide the old screen out and the new one in
 * - anything else that brings a screen in (data arriving after loading.tsx, redirects) rises in
 * Use it in page.tsx and loading.tsx, not in layouts: layouts persist, so enter/exit never fire.
 * `className` narrows a screen on wide displays (forms read best at a line length, not 1100px).
 */
export function Screen({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-in" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      <div className={`flex w-full flex-col gap-5 ${className}`}>{children}</div>
    </ViewTransition>
  );
}
