import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoImg from "@assets/ChatGPT_Image_1_May_2026_08_31_58_1777613580606.png";
import { useBgMusic } from "@/contexts/bg-music-context";

interface SplashScreenProps {
  onComplete: () => void;
}

/** Dokunmatik cihaz tespiti — render sırasında, hook değil */
function isTouch(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

const DESKTOP_DURATION = 3500; // ms — masaüstünde otomatik geç
const TOUCH_ANIM_MS   = 1800; // "Başla" sonrası kısa animasyon
const TOUCH_AUTO_SKIP = 15000; // dokunmadan otomatik geç (güvenlik)

const FLOATING_NOTES = [
  { x: "8%",  y: "12%", delay: 0.3, size: 28, color: "#FF8C00" },
  { x: "82%", y: "10%", delay: 0.6, size: 22, color: "#6C63FF" },
  { x: "5%",  y: "72%", delay: 0.9, size: 20, color: "#00C2A8" },
  { x: "88%", y: "68%", delay: 0.4, size: 26, color: "#4CAF50" },
  { x: "48%", y: "6%",  delay: 0.7, size: 18, color: "#FFD700" },
];

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const touch = useRef(isTouch());
  const [visible, setVisible]   = useState(true);
  const [started, setStarted]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { unlock } = useBgMusic();

  const finish = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    document.body.style.overflow = "";
    setVisible(false);
    // Kısa fade-out süresi sonrası onComplete
    setTimeout(onComplete, 400);
  }, [onComplete]);

  /* Masaüstü: mount'ta otomatik başlat, auto-skip kur */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    if (!touch.current) {
      setStarted(true);
      timerRef.current = setTimeout(finish, DESKTOP_DURATION);
    } else {
      // Dokunmatik: sadece güvenlik timer'ı
      timerRef.current = setTimeout(finish, TOUCH_AUTO_SKIP);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.body.style.overflow = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * "🎵 Başla" — KULLANICI GESTURE içinde çağrılır.
   * unlock() burada: iOS/Android ses kilidini açar.
   */
  const handleStart = useCallback(() => {
    if (started) return;
    unlock();        // ← user gesture context — iOS ses açılır ✓
    setStarted(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(finish, TOUCH_ANIM_MS);
  }, [started, unlock, finish]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
          style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 100%)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          {/* Yüzen notalar — started olunca görünür */}
          {started && FLOATING_NOTES.map((n, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none select-none"
              style={{ left: n.x, top: n.y, fontSize: n.size, color: n.color }}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 0.9, 0], y: -40 }}
              transition={{ delay: n.delay, duration: 2.5, repeat: Infinity, repeatDelay: 2, ease: "easeOut" }}
            >
              ♪
            </motion.div>
          ))}

          {/* Nabız halkası */}
          {started && (
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 300, height: 300,
                background: "radial-gradient(circle, rgba(108,99,255,0.2) 0%, rgba(108,99,255,0.05) 55%, transparent 75%)",
              }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* Logo */}
          <motion.img
            src={logoImg}
            alt="Gitar Öğreniyorum"
            className="w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 object-contain drop-shadow-2xl select-none"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            draggable={false}
          />

          {/* Başlık */}
          <motion.p
            className="mt-4 text-base sm:text-lg font-bold tracking-wide text-white/85 text-center px-6"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            Gitar Öğreniyorum
          </motion.p>

          <motion.p
            className="mt-1 text-xs text-white/45 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Temelden Başla, Müzikle Büyü!
          </motion.p>

          {/* Dokunmatik: Başla butonu */}
          {touch.current && !started && (
            <motion.button
              className="mt-10 px-12 py-4 rounded-2xl text-white font-bold text-lg shadow-2xl active:scale-95 touch-manipulation"
              style={{ background: "linear-gradient(135deg, #4299e1 0%, #6C63FF 100%)" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              onClick={handleStart}
            >
              🎵 Başla
            </motion.button>
          )}

          {/* Masaüstü: "Geç" */}
          {!touch.current && (
            <motion.button
              className="absolute bottom-6 text-sm text-white/30 hover:text-white/60 transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              onClick={finish}
            >
              Geç →
            </motion.button>
          )}

          {/* Yükleniyor göstergesi — started sonrası */}
          {touch.current && started && (
            <motion.div
              className="mt-8 flex items-center gap-2 text-white/40 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white/70 animate-spin" />
              Yükleniyor…
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
