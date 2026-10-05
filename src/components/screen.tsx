import { ViewTransition } from "react";

/**
 * Wraps one screen's content so navigation animates (styles in globals.css):
 * - tab links tagged nav-forward / nav-back slide the old screen out and the new one in
 * - anything else that brings a screen in (data arriving after loading.tsx, redirects) rises in
 * Use it in page.tsx and loading.tsx, not in layouts: layouts persist, so enter/exit never fire.
 */
export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-in" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      <div className="flex flex-col gap-5">{children}</div>
    </ViewTransition>
  );
}
