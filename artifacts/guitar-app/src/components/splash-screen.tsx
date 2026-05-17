import { useEffect, useRef, useState } from "react";
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
  { x: "10%", y: "15%", delay: 0.3, size: 24, color: "#FF8C00" },
  { x: "80%", y: "12%", delay: 0.5, size: 20, color: "#6C63FF" },
  { x: "86%", y: "65%", delay: 0.4, size: 22, color: "#4CAF50" },
];

function FloatingNote({ x, y, delay, size, color, lite }: typeof NOTES_DESKTOP[0] & { lite: boolean }) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{ left: x, top: y, fontSize: size }}
      initial={{ opacity: 0, scale: 0, y: 0 }}
      animate={{ opacity: [0, 0.9, 0.9, 0], scale: [0, 1.2, 1, 0.8], y: [0, -25, -50] }}
      transition={{
        delay,
        duration: lite ? 2.2 : 2.8,
        repeat: Infinity,
        repeatDelay: lite ? 2.5 : 1.8,
        ease: "easeOut",
      }}
    >
      <span style={{ color }}>♪</span>
    </motion.div>
  );
}

// Mobilde daha kısa splash süresi
const SPLASH_DURATION_LITE    = 2800;
const SPLASH_DURATION_DESKTOP = 3800;

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { unlock } = useBgMusic();
  const lite = useLiteMode();

  const finish = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    document.body.style.overflow = "";
    setVisible(false);
    setTimeout(onComplete, lite ? 400 : 650);
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";

    // Müziği hemen başlat
    unlock();

    // Tarayıcı autoplay'i engellerse ilk dokunuşta başlat
    const handleInteraction = () => { unlock(); };
    document.addEventListener("click",      handleInteraction, { once: true });
    document.addEventListener("touchstart", handleInteraction, { once: true });

    // Animasyon bitince otomatik geç
    timerRef.current = setTimeout(finish, lite ? SPLASH_DURATION_LITE : SPLASH_DURATION_DESKTOP);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("click",      handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
      document.body.style.overflow = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notes = lite ? NOTES_LITE : NOTES_DESKTOP;

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
          transition={{ duration: lite ? 0.3 : 0.6, ease: "easeInOut" }}
          onClick={() => unlock()}
        >
          {notes.map((n, i) => <FloatingNote key={i} {...n} lite={lite} />)}

          {/* Arka plan bloblari — sadece masaüstünde */}
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

          {/* Nabız halkası — masaüstünde animasyonlu, mobilde statik */}
          {!lite ? (
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 340, height: 340,
                background: "radial-gradient(circle, rgba(108,99,255,0.30) 0%, rgba(108,99,255,0.06) 55%, transparent 75%)",
              }}
              animate={{ scale: [1, 1.18, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : (
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 280, height: 280,
                background: "radial-gradient(circle, rgba(108,99,255,0.20) 0%, transparent 75%)",
              }}
            />
          )}

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.35, opacity: 0, rotate: -8 }}
            animate={{ scale: [0.35, 1.05, 1], opacity: [0, 1, 1], rotate: [-8, 2, 0] }}
            transition={{ duration: lite ? 0.7 : 1.1, ease: "easeOut", times: [0, 0.75, 1] }}
          >
            <motion.img
              src={logoImg}
              alt="Gitar Öğreniyorum"
              className="w-64 h-64 sm:w-80 sm:h-80 object-contain drop-shadow-2xl select-none"
              animate={lite ? {} : { y: [0, -14, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
              draggable={false}
            />
          </motion.div>

          <motion.p
            className="mt-6 text-base sm:text-xl font-bold tracking-wide text-white/90"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: lite ? 0.5 : 1.0, duration: lite ? 0.4 : 0.7 }}
          >
            Temelden Başla, Müzikle Büyü!
          </motion.p>

          {/* Geç butonu */}
          <motion.button
            className="absolute bottom-6 text-sm text-white/35 hover:text-white/65 transition-colors pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: lite ? 1.2 : 2.5 }}
            onClick={(e) => { e.stopPropagation(); finish(); }}
          >
            Geç →
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
