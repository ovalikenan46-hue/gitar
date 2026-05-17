import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoImg from "@assets/ChatGPT_Image_1_May_2026_08_31_58_1777613580606.png";
import { useBgMusic } from "@/contexts/bg-music-context";
import { useLiteMode } from "@/hooks/use-lite-mode";

interface SplashScreenProps {
  onComplete: () => void;
}

const NOTES_DESKTOP = [
  { x: "10%", y: "15%", delay: 0.4, size: 30, color: "#FF8C00" },
  { x: "80%", y: "12%", delay: 0.7, size: 24, color: "#6C63FF" },
  { x: "6%",  y: "70%", delay: 1.0, size: 22, color: "#00C2A8" },
  { x: "86%", y: "65%", delay: 0.5, size: 28, color: "#4CAF50" },
  { x: "22%", y: "80%", delay: 1.2, size: 20, color: "#FFD700" },
  { x: "75%", y: "78%", delay: 0.9, size: 26, color: "#FF6B8A" },
  { x: "50%", y: "8%",  delay: 0.6, size: 18, color: "#6C63FF" },
  { x: "92%", y: "38%", delay: 1.1, size: 22, color: "#FF8C00" },
];

const NOTES_LITE = [
  { x: "12%", y: "18%", delay: 0.1, size: 26, color: "#FF8C00" },
  { x: "78%", y: "14%", delay: 0.2, size: 22, color: "#6C63FF" },
  { x: "85%", y: "68%", delay: 0.3, size: 20, color: "#00C2A8" },
];

function FloatingNote({ x, y, delay, size, color, lite }: typeof NOTES_DESKTOP[0] & { lite: boolean }) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{ left: x, top: y, fontSize: size }}
      initial={{ opacity: 0, scale: 0, y: 0 }}
      animate={{ opacity: [0, 0.9, 0.9, 0], scale: [0, 1.2, 1, 0.8], y: [0, -25, -50] }}
      transition={{ delay, duration: lite ? 1.8 : 2.8, repeat: Infinity, repeatDelay: lite ? 3 : 1.8, ease: "easeOut" }}
    >
      <span style={{ color }}>♪</span>
    </motion.div>
  );
}

/* Ana ekrana ekle kılavuzu — sadece mobilde gösterilir */
function InstallHint() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  const isAndroid = /Android/.test(ua);
  if (!isIOS && !isAndroid) return null;
  const alreadyAdded =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  if (alreadyAdded) return null;

  return (
    <motion.div
      className="absolute bottom-6 left-4 right-4 flex items-center justify-center gap-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.5 }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs text-white/70"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        <span className="text-base">📲</span>
        {isIOS
          ? <span>Ana ekrana ekle: <strong>Paylaş</strong> → <strong>Ana Ekrana Ekle</strong></span>
          : <span>Uygulamayı <strong>ana ekrana</strong> ekleyebilirsin</span>
        }
      </div>
    </motion.div>
  );
}

const DESKTOP_DURATION = 3800;
const MOBILE_INTRO_MS  = 1800;
const MOBILE_AUTO_SKIP = 9000;

type Phase = "idle" | "playing";

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase]     = useState<Phase>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { unlock } = useBgMusic();
  const lite = useLiteMode();

  const finish = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    document.body.style.overflow = "";
    setVisible(false);
    setTimeout(onComplete, lite ? 350 : 600);
  }, [lite, onComplete]);

  /* Mobil: "🎵 Başla" butonuna basıldığında */
  const handleStart = useCallback(() => {
    if (phase === "playing") return;
    setPhase("playing");
    unlock();
    timerRef.current = setTimeout(finish, MOBILE_INTRO_MS);
  }, [phase, unlock, finish]);

  /* Masaüstü: ekrana herhangi bir yerde tıklayınca sesi başlat */
  const handleDesktopClick = useCallback(() => {
    unlock();
  }, [unlock]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    if (!lite) {
      /* Masaüstü: hemen çalmayı dene (autoplay izinli tarayıcılarda çalışır) */
      unlock();
      setPhase("playing");
      timerRef.current = setTimeout(finish, DESKTOP_DURATION);
    } else {
      /* Mobil: kullanıcı dokunmadan ses başlatma — auto-skip */
      timerRef.current = setTimeout(finish, MOBILE_AUTO_SKIP);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.body.style.overflow = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notes = lite ? NOTES_LITE : NOTES_DESKTOP;
  const showNotes = !lite || phase === "playing";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
          style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 100%)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: lite ? 0.25 : 0.6, ease: "easeInOut" }}
          onClick={!lite ? handleDesktopClick : undefined}
        >
          {showNotes && notes.map((n, i) => <FloatingNote key={i} {...n} lite={lite} />)}

          {/* Blur blob'ları — masaüstünde */}
          {!lite && (
            <>
              <div className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[90px] pointer-events-none"
                style={{ background: "radial-gradient(circle, #4299e1, transparent)", top: "-10%", left: "-10%" }} />
              <div className="absolute w-[400px] h-[400px] rounded-full opacity-20 blur-[80px] pointer-events-none"
                style={{ background: "radial-gradient(circle, #00C2A8, transparent)", bottom: "-10%", right: "-10%" }} />
              <div className="absolute w-[300px] h-[300px] rounded-full opacity-15 blur-[60px] pointer-events-none"
                style={{ background: "radial-gradient(circle, #6C63FF, transparent)", top: "30%", right: "5%" }} />
            </>
          )}

          {/* Nabız halkası */}
          {phase === "playing" && (
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: lite ? 260 : 340, height: lite ? 260 : 340,
                background: "radial-gradient(circle, rgba(108,99,255,0.25) 0%, rgba(108,99,255,0.06) 55%, transparent 75%)",
              }}
              animate={lite
                ? { scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5] }
                : { scale: [1, 1.18, 1], opacity: [0.5, 1, 0.5] }
              }
              transition={{ duration: lite ? 2 : 3, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: lite ? 0.5 : 1.0, ease: "easeOut" }}
          >
            <motion.img
              src={logoImg}
              alt="Gitar Öğreniyorum"
              className="w-56 h-56 sm:w-72 sm:h-72 object-contain drop-shadow-2xl select-none"
              animate={
                !lite && phase === "playing" ? { y: [0, -14, 0] }
                : lite && phase === "playing" ? { scale: [1, 1.04, 1] }
                : {}
              }
              transition={{ duration: lite ? 1.6 : 3.2, repeat: Infinity, ease: "easeInOut", delay: lite ? 0 : 1.2 }}
              draggable={false}
            />
          </motion.div>

          {/* Başlık */}
          <motion.p
            className="mt-5 text-base sm:text-xl font-bold tracking-wide text-white/90"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: lite ? 0.3 : 0.9, duration: 0.4 }}
          >
            Temelden Başla, Müzikle Büyü!
          </motion.p>

          {/* Masaüstü: ses ipucu */}
          {!lite && phase === "playing" && (
            <motion.p
              className="mt-3 text-xs text-white/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              🔊 Müzik çalıyor — tıkla veya bekle
            </motion.p>
          )}

          {/* Mobil: "🎵 Başla" butonu */}
          {lite && phase === "idle" && (
            <motion.button
              className="mt-8 px-10 py-4 rounded-2xl text-white font-bold text-lg shadow-2xl active:scale-95"
              style={{ background: "linear-gradient(135deg, #4299e1 0%, #6C63FF 100%)" }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              onClick={handleStart}
            >
              🎵 Başla
            </motion.button>
          )}

          {/* Mobil playing fazı */}
          {lite && phase === "playing" && (
            <motion.p
              className="mt-6 text-xs text-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Yükleniyor…
            </motion.p>
          )}

          {/* Masaüstü: "Geç" butonu */}
          {!lite && (
            <motion.button
              className="absolute bottom-6 text-sm text-white/35 hover:text-white/65 transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
              onClick={finish}
            >
              Geç →
            </motion.button>
          )}

          {/* Mobil: Ana ekrana ekle kılavuzu */}
          {lite && <InstallHint />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
