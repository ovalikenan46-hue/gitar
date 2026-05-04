import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoImg from "@assets/ChatGPT_Image_1_May_2026_08_31_58_1777613580606.png";

interface SplashScreenProps {
  onComplete: () => void;
}

const NOTES = [
  { x: "10%", y: "15%", delay: 0.4, size: 30, color: "#FF8C00" },
  { x: "80%", y: "12%", delay: 0.7, size: 24, color: "#6C63FF" },
  { x: "6%",  y: "70%", delay: 1.0, size: 22, color: "#00C2A8" },
  { x: "86%", y: "65%", delay: 0.5, size: 28, color: "#4CAF50" },
  { x: "22%", y: "80%", delay: 1.2, size: 20, color: "#FFD700" },
  { x: "75%", y: "78%", delay: 0.9, size: 26, color: "#FF6B8A" },
  { x: "50%", y: "8%",  delay: 0.6, size: 18, color: "#6C63FF" },
  { x: "92%", y: "38%", delay: 1.1, size: 22, color: "#FF8C00" },
];

function FloatingNote({ x, y, delay, size, color }: typeof NOTES[0]) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{ left: x, top: y, fontSize: size }}
      initial={{ opacity: 0, scale: 0, y: 0 }}
      animate={{ opacity: [0, 0.9, 0.9, 0], scale: [0, 1.3, 1, 0.8], y: [0, -35, -70] }}
      transition={{ delay, duration: 2.8, repeat: Infinity, repeatDelay: 1.8, ease: "easeOut" }}
    >
      <span style={{ color }}>♪</span>
    </motion.div>
  );
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (audioRef.current) { audioRef.current.pause(); }
    document.body.style.overflow = "";
    setVisible(false);
    setTimeout(onComplete, 650);
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const base = import.meta.env.BASE_URL ?? "/";
    const audio = new Audio(`${base}sounds/intro.mp3`);
    audio.volume = 0.85;
    audio.preload = "auto";
    audioRef.current = audio;

    /* Ses bitince geç */
    audio.addEventListener("ended", () => setTimeout(finish, 350), { once: true });

    /* Ses yüklenemezse veya autoplay engellendiyse — 5 saniye sonra geç */
    audio.addEventListener("error", () => {
      timerRef.current = setTimeout(finish, 5000);
    }, { once: true });

    audio.addEventListener("canplaythrough", () => {
      audio.play().catch(() => {
        /* Autoplay engellendi — tap istemeden, 5 sn sonra otomatik geç */
        timerRef.current = setTimeout(finish, 5000);
      });
    }, { once: true });

    audio.load();

    /* Mutlak güvenlik: 14 sn sonra her durumda geç */
    timerRef.current = setTimeout(finish, 14000);

    return () => {
      clearTimeout(timerRef.current!);
      audio.pause();
      document.body.style.overflow = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-pointer select-none"
          style={{
            background:
              "linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 100%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Floating music notes */}
          {NOTES.map((n, i) => <FloatingNote key={i} {...n} />)}

          {/* Color blobs */}
          <div className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[90px] pointer-events-none"
            style={{ background: "radial-gradient(circle, #4299e1, transparent)", top: "-10%", left: "-10%" }} />
          <div className="absolute w-[400px] h-[400px] rounded-full opacity-20 blur-[80px] pointer-events-none"
            style={{ background: "radial-gradient(circle, #00C2A8, transparent)", bottom: "-10%", right: "-10%" }} />
          <div className="absolute w-[300px] h-[300px] rounded-full opacity-15 blur-[60px] pointer-events-none"
            style={{ background: "radial-gradient(circle, #6C63FF, transparent)", top: "30%", right: "5%" }} />

          {/* Glow ring */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 340, height: 340,
              background:
                "radial-gradient(circle, rgba(108,99,255,0.30) 0%, rgba(108,99,255,0.06) 55%, transparent 75%)",
            }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.35, opacity: 0, rotate: -8 }}
            animate={{ scale: [0.35, 1.1, 1], opacity: [0, 1, 1], rotate: [-8, 4, 0] }}
            transition={{ duration: 1.1, ease: "easeOut", times: [0, 0.75, 1] }}
          >
            <motion.img
              src={logoImg}
              alt="Gitar Öğreniyorum"
              className="w-64 h-64 sm:w-80 sm:h-80 object-contain drop-shadow-2xl select-none"
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
              draggable={false}
            />
          </motion.div>

          {/* Subtitle */}
          <motion.p
            className="mt-6 text-base sm:text-xl font-bold tracking-wide text-white/90"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.7 }}
          >
            Temelden Başla, Müzikle Büyü!
          </motion.p>

          {/* Skip — bottom */}
          <motion.button
            className="absolute bottom-6 text-sm text-white/35 hover:text-white/65 transition-colors pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5 }}
            onClick={(e) => { e.stopPropagation(); finish(); }}
          >
            Geç →
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
