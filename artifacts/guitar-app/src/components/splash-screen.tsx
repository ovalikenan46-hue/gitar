import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoImg from "@assets/ChatGPT_Image_1_May_2026_08_31_58_1777613580606.png";
import { useBgMusic } from "@/contexts/bg-music-context";

interface SplashScreenProps {
  onComplete: () => void;
  /** App.tsx'ten gelir: splash tamamlandıysa unmount et */
  visible: boolean;
}

/** Dokunmatik cihaz tespiti */
function detectTouch(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

const BASE_URL = (import.meta as { env: { BASE_URL: string } }).env.BASE_URL ?? "/";
const INTRO_SRC = BASE_URL.replace(/\/$/, "") + "/sounds/intro.mp3";

const DESKTOP_MS   = 4000;  // masaüstünde otomatik geç
const TOUCH_ANI_MS = 2200;  // "Başla" sonrası animasyon süresi
const SAFETY_MS    = 20000; // dokunmadan güvenlik zaman aşımı

const NOTES = [
  { x: "8%",  y: "12%", delay: 0.3, size: 28, color: "#FF8C00" },
  { x: "82%", y: "10%", delay: 0.6, size: 22, color: "#6C63FF" },
  { x: "5%",  y: "72%", delay: 0.9, size: 20, color: "#00C2A8" },
  { x: "88%", y: "68%", delay: 0.4, size: 26, color: "#4CAF50" },
  { x: "48%", y: "6%",  delay: 0.7, size: 18, color: "#FFD700" },
  { x: "92%", y: "35%", delay: 1.1, size: 16, color: "#FF6B8A" },
];

export function SplashScreen({ onComplete, visible }: SplashScreenProps) {
  const isTouch      = useRef(detectTouch());
  const [show, setShow]       = useState(true);
  const [started, setStarted] = useState(false);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introRef    = useRef<HTMLAudioElement | null>(null);
  const { preUnlock, unlock } = useBgMusic();

  /** intro.mp3'ü durdur ve temizle */
  const stopIntro = useCallback(() => {
    const a = introRef.current;
    if (!a) return;
    a.pause();
    a.src = "";
    introRef.current = null;
  }, []);

  /** Splash animasyonu biter, onComplete çağrılır */
  const finish = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    stopIntro();
    document.body.style.overflow = "";
    setShow(false);
    // Fade-out tamamlandıktan sonra App.tsx'e bildir
    // → App.tsx: setSplashDone(true) + unlock() (bg-music başlar)
    setTimeout(onComplete, 380);
  }, [stopIntro, onComplete]);

  /** intro.mp3 oynat */
  const playIntro = useCallback(() => {
    stopIntro();
    const audio = new Audio(INTRO_SRC);
    audio.volume = 0.75;
    audio.play().catch(() => {}); // autoplay engellenirse sessizce geç
    introRef.current = audio;
    // intro.mp3 bitince splash'i de bitir (TOUCH_ANI_MS'den önce biterse)
    audio.addEventListener("ended", finish, { once: true });
  }, [stopIntro, finish]);

  useEffect(() => {
    if (!visible) return; // App.tsx splashDone=true olduysa çalışma
    document.body.style.overflow = "hidden";

    if (!isTouch.current) {
      // Masaüstü: autoplay dene + otomatik geç
      setStarted(true);
      playIntro();
      timerRef.current = setTimeout(finish, DESKTOP_MS);
    } else {
      // Dokunmatik: kullanıcı "Başla" basana kadar bekle
      // Güvenlik timer'ı: kullanıcı basmazsa otomatik geç
      timerRef.current = setTimeout(finish, SAFETY_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      stopIntro();
      document.body.style.overflow = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * "🎵 Başla" — KULLANICI GESTURE (tap) içinde çağrılır.
   *
   * iOS/Android ses kilit açma:
   *  1. preUnlock(): bg-music audio'yu sessizce play→pause → iOS kilidini açar
   *  2. intro.mp3 play(): intro müziği başlar (aynı gesture → izin verilir)
   *
   * Splash bittikten sonra App.tsx'teki unlock() bg-music'i başlatır.
   * Bu artık güvenli çünkü preUnlock() element'i user-activated yaptı.
   */
  const handleStart = useCallback(() => {
    if (started) return;

    // 1) bg-music'i sessizce unlock et (iOS audio policy gereği gesture içinde)
    preUnlock();

    // 2) intro.mp3 başlat (aynı gesture içinde — iOS izin verir)
    playIntro();

    setStarted(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(finish, TOUCH_ANI_MS);
  }, [started, preUnlock, playIntro, finish]);

  // visible=false olduğunda (splashDone) temizle
  useEffect(() => {
    if (!visible) {
      stopIntro();
    }
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
          {/* Yüzen notalar */}
          {started && NOTES.map((n, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none select-none"
              style={{ left: n.x, top: n.y, fontSize: n.size, color: n.color }}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 0.85, 0], y: -44 }}
              transition={{
                delay: n.delay,
                duration: 2.4,
                repeat: Infinity,
                repeatDelay: 1.8,
                ease: "easeOut",
              }}
            >
              ♪
            </motion.div>
          ))}

          {/* Nabız halkası */}
          {started && (
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
          )}

          {/* Logo */}
          <motion.img
            src={logoImg}
            alt="Gitar Öğreniyorum"
            className="w-44 h-44 sm:w-60 sm:h-60 md:w-72 md:h-72 object-contain drop-shadow-2xl select-none"
            initial={{ scale: 0.45, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            draggable={false}
          />

          {/* Başlık */}
          <motion.p
            className="mt-4 text-base sm:text-xl font-bold tracking-wide text-white/90 text-center px-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            Gitar Öğreniyorum
          </motion.p>

          <motion.p
            className="mt-1.5 text-xs sm:text-sm text-white/40 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            Temelden Başla, Müzikle Büyü!
          </motion.p>

          {/* Dokunmatik: "Başla" butonu */}
          {isTouch.current && !started && (
            <motion.button
              className="mt-10 px-12 py-4 rounded-2xl text-white font-bold text-lg sm:text-xl shadow-2xl active:scale-95 touch-manipulation"
              style={{ background: "linear-gradient(135deg, #4299e1 0%, #6C63FF 100%)" }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              onClick={handleStart}
            >
              🎵 Başla
            </motion.button>
          )}

          {/* Masaüstü: "Geç" */}
          {!isTouch.current && (
            <motion.button
              className="absolute bottom-7 text-sm text-white/28 hover:text-white/65 transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.2 }}
              onClick={finish}
            >
              Geç →
            </motion.button>
          )}

          {/* started → "Yükleniyor" */}
          {isTouch.current && started && (
            <motion.div
              className="mt-8 flex items-center gap-2 text-white/38 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-4 h-4 rounded-full border-2 border-white/25 border-t-white/65 animate-spin" />
              Yükleniyor…
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
