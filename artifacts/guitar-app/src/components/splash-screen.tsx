import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoImg from "@assets/ChatGPT_Image_1_May_2026_08_31_58_1777613580606.png";

interface SplashScreenProps {
  onComplete: () => void;
  visible: boolean;
}

const BASE_URL  = (import.meta as { env: { BASE_URL: string } }).env.BASE_URL ?? "/";
const INTRO_SRC = BASE_URL.replace(/\/$/, "") + "/sounds/intro.mp3";

/**
 * Ses çalamazsa (iOS autoplay engeli) kaç ms sonra ana sayfaya geç.
 * Ses çalarsa "ended" eventi bekler — bitmeden geçmez.
 */
const FALLBACK_MS = 5000;
/**
 * Ses çalsa bile bu süreden uzun sürmesine izin verme (güvenlik).
 */
const MAX_MS = 15000;

const NOTES = [
  { x: "8%",  y: "12%", delay: 0.2, size: 28, color: "#FF8C00" },
  { x: "82%", y: "10%", delay: 0.5, size: 22, color: "#6C63FF" },
  { x: "5%",  y: "72%", delay: 0.8, size: 20, color: "#00C2A8" },
  { x: "88%", y: "68%", delay: 0.3, size: 26, color: "#4CAF50" },
  { x: "48%", y: "6%",  delay: 0.6, size: 18, color: "#FFD700" },
  { x: "92%", y: "38%", delay: 1.0, size: 16, color: "#FF6B8A" },
];

export function SplashScreen({ onComplete, visible }: SplashScreenProps) {
  const [show, setShow]   = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introRef = useRef<HTMLAudioElement | null>(null);

  const stopIntro = useCallback(() => {
    const a = introRef.current;
    if (!a) return;
    a.removeEventListener("ended", () => {});
    a.pause();
    a.src = "";
    introRef.current = null;
  }, []);

  const finish = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    stopIntro();
    document.body.style.overflow = "";
    setShow(false);
    setTimeout(onComplete, 380);
  }, [stopIntro, onComplete]);

  useEffect(() => {
    if (!visible) return;
    document.body.style.overflow = "hidden";

    const audio = new Audio(INTRO_SRC);
    audio.volume = 0.8;
    introRef.current = audio;

    // Müzik bittiğinde otomatik geç
    const onEnded = () => finish();
    audio.addEventListener("ended", onEnded, { once: true });

    // Güvenlik: müzik ne kadar sürer bilinmez, max süre
    timerRef.current = setTimeout(finish, MAX_MS);

    // Autoplay dene
    audio.play().catch(() => {
      // iOS/Android autoplay engeli — kısa animasyondan sonra geç
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(finish, FALLBACK_MS);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
      audio.src = "";
      document.body.style.overflow = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dışarıdan visible=false gelirse temizle
  useEffect(() => {
    if (!visible) stopIntro();
  }, [visible, stopIntro]);

  return (
    <AnimatePresence>
      {show && visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 100%)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.38, ease: "easeInOut" }}
        >
          {/* Yüzen notalar — başından beri */}
          {NOTES.map((n, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none select-none"
              style={{ left: n.x, top: n.y, fontSize: n.size, color: n.color }}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 0.85, 0], y: -48 }}
              transition={{
                delay: n.delay,
                duration: 2.6,
                repeat: Infinity,
                repeatDelay: 1.6,
                ease: "easeOut",
              }}
            >
              ♪
            </motion.div>
          ))}

          {/* Nabız halkası */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 320, height: 320,
              background:
                "radial-gradient(circle, rgba(108,99,255,0.18) 0%, rgba(108,99,255,0.04) 55%, transparent 75%)",
            }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Logo */}
          <motion.img
            src={logoImg}
            alt="Gitar Öğreniyorum"
            className="w-44 h-44 sm:w-60 sm:h-60 md:w-72 md:h-72 object-contain drop-shadow-2xl select-none relative z-10"
            initial={{ scale: 0.45, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            draggable={false}
          />

          {/* Başlık */}
          <motion.p
            className="mt-4 text-base sm:text-xl font-bold tracking-wide text-white/90 text-center px-6 relative z-10"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            Gitar Öğreniyorum
          </motion.p>

          <motion.p
            className="mt-1.5 text-xs sm:text-sm text-white/40 text-center relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            Temelden Başla, Müzikle Büyü!
          </motion.p>

          {/* Müzik nota animasyonu */}
          <motion.div
            className="mt-10 flex items-center gap-3 relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 rounded-full"
                style={{ background: "rgba(108,99,255,0.7)", height: 20 }}
                animate={{ scaleY: [0.4, 1.4, 0.4] }}
                transition={{
                  delay: i * 0.12,
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.div>

          {/* Geç butonu */}
          <motion.button
            className="absolute bottom-7 text-sm text-white/25 hover:text-white/60 transition-colors active:opacity-70 touch-manipulation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3 }}
            onClick={finish}
          >
            Geç →
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
