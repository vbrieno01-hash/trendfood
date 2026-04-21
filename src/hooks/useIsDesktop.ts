import { useEffect, useState } from "react";

/**
 * Returns true when viewport width is >= breakpoint (default 1024px / lg).
 * SSR-safe: starts false, updates after mount + on resize.
 * Used to disable expensive scroll-linked / mouse-tracking effects on mobile.
 */
export function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= breakpoint);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isDesktop;
}