import { useMemo } from "react";

/**
 * Mobil / tablet veya prefers-reduced-motion açıksa true döner.
 * SSR-safe değil ama bu proje Vite SPA olduğu için window erişimi güvenli.
 * İlk render'da doğru değeri verir — hook güncellemesi gerekmez.
 */
export function useLiteMode(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    const isMobileViewport = window.innerWidth < 1024;
    const prefersReduced   = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return isMobileViewport || prefersReduced;
  }, []);
}
