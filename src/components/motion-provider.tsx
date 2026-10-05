"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

/**
 * App-wide Motion setup.
 * - `m` components + LazyMotion keep the bundle small; domAnimation covers enter/exit and
 *   gestures (no drag or layout animations are used).
 * - reducedMotion="user": with the OS setting on, transform animations are skipped and only
 *   fades remain.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
