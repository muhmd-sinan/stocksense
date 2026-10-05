"use client";

import { animate } from "motion/react";
import { useEffect, useRef } from "react";
import { formatINR } from "@/lib/format";

const plain = new Intl.NumberFormat("en-IN");

function show(v: number, format: "number" | "inr") {
  return format === "inr" ? formatINR(v) : plain.format(v);
}

/**
 * A number that counts up once when it mounts. The server renders the final value, so screen
 * readers and no-JS get the real figure; reduced motion skips the count entirely.
 */
export function Ticker({ value, format = "number" }: { value: number; format?: "number" | "inr" }) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = show(value, format);

  useEffect(() => {
    const el = ref.current;
    if (!el || value <= 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = show(Math.round(v), format);
      },
      onComplete: () => {
        el.textContent = final;
      },
    });
    return () => {
      controls.stop();
      el.textContent = final;
    };
  }, [value, format, final]);

  return (
    <span ref={ref} className="tabular-nums">
      {final}
    </span>
  );
}
