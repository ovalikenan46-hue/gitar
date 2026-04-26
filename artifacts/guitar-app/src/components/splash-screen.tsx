import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoImg from "@assets/ChatGPT_Image_Apr_26,_2026,_08_50_21_AM_1777187022196.png";

interface SplashScreenProps {
  onComplete: () => void;
}

const NOTE_POSITIONS = [
  { x: "12%", y: "18%", delay: 0.3, size: 28, color: "#FF8C00" },
  { x: "82%", y: "14%", delay: 0.6, size: 22, color: "#6C63FF" },
  { x: "8%",  y: "72%", delay: 0.9, size: 20, color: "#00C2A8" },
  { x: "88%", y: "68%", delay: 0.5, size: 26, color: "#4CAF50" },
  { x: "20%", y: "42%", delay: 1.1, size: 18, color: "#FFD700" },
  { x: "78%", y: "40%", delay: 0.7, size: 24, color: "#FF6B8A" },
];

function FloatingNote({ x, y, delay, size, color }: typeof NOTE_POSITIONS[0]) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none opacity-70"
      style={{ left: x, top: y, fontSize: size }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.8, 0.8, 0],
        scale: [0, 1.2, 1, 0.8],
        y: [0, -40, -80],
      }}
      transition={{
        delay,
        duration: 2.5,
        repeat: Infinity,
        repeatDelay: 1.5,
        ease: "easeOut",
      }}
    >
      <span style={{ color }}>♪</span>
    </motion.div>
  );
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startFadeOut = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
    setTimeout(onComplete, 700);
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const base = import.meta.env.BASE_URL ?? "/";
    const audio = new Audio(`${base}sounds/intro.mp3`);
    audio.volume = 0.8;
    audio.preload = "auto";
    audioRef.current = audio;

    const fallback = setTimeout(startFadeOut, 8000);
    timeoutRef.current = fallback;

    const onLoaded = () => {
      audio.play().catch(() => {});
    };

    const onEnded = () => {
      setTimeout(startFadeOut, 400);
    };

    const onError = () => {
      startFadeOut();
    };

    audio.addEventListener("canplaythrough", onLoaded, { once: true });
    audio.addEventListener("ended", onEnded, { once: true });
    audio.addEventListener("error", onError, { once: true });
    audio.load();

    return () => {
      clearTimeout(fallback);
      audio.pause();
      audio.removeEventListener("canplaythrough", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #e8f4fd 0%, #ffffff 40%, #fff8f0 70%, #e8fdf8 100%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
        >
          {/* Floating particles */}
          {NOTE_POSITIONS.map((n, i) => (
            <FloatingNote key={i} {...n} />
          ))}

          {/* Soft blobs */}
          <div
            className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[80px] pointer-events-none"
            style={{ background: "radial-gradient(circle, #4299e1 0%, transparent 70%)", top: "-10%", left: "-10%" }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full opacity-20 blur-[80px] pointer-events-none"
            style={{ background: "radial-gradient(circle, #00C2A8 0%, transparent 70%)", bottom: "-10%", right: "-10%" }}
          />
          <div
            className="absolute w-[300px] h-[300px] rounded-full opacity-15 blur-[60px] pointer-events-none"
            style={{ background: "radial-gradient(circle, #6C63FF 0%, transparent 70%)", top: "30%", right: "5%" }}
          />

          {/* Glow ring behind logo */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 320,
              height: 320,
              background: "radial-gradient(circle, rgba(66,153,225,0.25) 0%, rgba(66,153,225,0.08) 50%, transparent 70%)",
            }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0, rotate: -5 }}
            animate={{
              scale: [0.4, 1.12, 1],
              opacity: [0, 1, 1],
              rotate: [-5, 3, 0],
            }}
            transition={{ duration: 1.2, ease: "easeOut", times: [0, 0.75, 1] }}
          >
            <motion.img
              src={logoImg}
              alt="Gitar Öğreniyorum"
              className="w-64 h-64 sm:w-80 sm:h-80 object-contain drop-shadow-2xl select-none"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
              draggable={false}
            />
          </motion.div>

          {/* Subtitle */}
          <motion.p
            className="mt-6 text-lg sm:text-xl font-bold tracking-wide"
            style={{ color: "#1B3A6B" }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.7, ease: "easeOut" }}
          >
            Temelden Başla, Müzikle Büyü!
          </motion.p>

          {/* Tap to skip */}
          <motion.button
            className="absolute bottom-8 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.5 }}
            onClick={startFadeOut}
          >
            Geç →
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
