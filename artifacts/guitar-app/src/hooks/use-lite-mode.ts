import { useMemo } from "react";

/**
 * Mobil / tablet, dokunmatik ekran veya prefers-reduced-motion aktifse true döner.
 * Vite SPA olduğu için window erişimi her zaman güvenli.
 * İlk render'da doğru değeri verir; sonradan değişmez.
 */
export function useLiteMode(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    const isSmallScreen  = window.innerWidth < 1024;
    const isTouch        = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return isSmallScreen || isTouch || prefersReduced;
  }, []);
}
