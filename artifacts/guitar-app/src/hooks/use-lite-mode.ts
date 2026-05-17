import { useMemo } from "react";

/**
 * Mobil / tablet, dokunmatik ekran, prefers-reduced-motion
 * veya standalone PWA modunda true döner.
 *
 * "Lite mod" aktifken:
 *  - Ağır animasyonlar (blob, büyük blur, particle yağmuru) kapatılır.
 *  - Hafif intro animasyonlarına izin verilir (logo scale/fade, 2-3 yüzen nota).
 *  - Kart içeriği animasyon beklenmeden anında görünür olur.
 */
export function useLiteMode(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    const isSmallScreen  = window.innerWidth < 1024;
    const isTouch        = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isStandalone   =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    return isSmallScreen || isTouch || prefersReduced || isStandalone;
  }, []);
}
