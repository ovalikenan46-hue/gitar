import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import handImg from "@assets/ChatGPT_Image_1_May_2026_09_50_42_1777618251403.png";
import { chordImages } from "@/utils/chordImages";

// ── Chord metadata ────────────────────────────────────────────────────────────
const CHORD_INFO: Record<string, {
  name: string;
  audioFile: string;
  fingers: { n: number; desc: string }[];
}> = {
  Em: {
    name: "Mi Minör (Em)",
    audioFile: "em-chord.mp4",
    fingers: [
      { n: 2, desc: "Orta — A teli, 2. perde" },
      { n: 3, desc: "Yüzük — D teli, 2. perde" },
    ],
  },
  Am: {
    name: "La Minör (Am)",
    audioFile: "am-chord.mp4",
    fingers: [
      { n: 1, desc: "İşaret — B teli, 1. perde" },
      { n: 2, desc: "Orta — D teli, 2. perde" },
      { n: 3, desc: "Yüzük — G teli, 2. perde" },
    ],
  },
  C: {
    name: "Do Majör (C)",
    audioFile: "chords/C.mp4",
    fingers: [
      { n: 1, desc: "İşaret — B teli, 1. perde" },
      { n: 2, desc: "Orta — D teli, 2. perde" },
      { n: 3, desc: "Yüzük — A teli, 3. perde" },
    ],
  },
  D: {
    name: "Re Majör (D)",
    audioFile: "chords/D.mp4",
    fingers: [
      { n: 1, desc: "İşaret — G teli, 2. perde" },
      { n: 2, desc: "Orta — e teli, 2. perde" },
      { n: 3, desc: "Yüzük — B teli, 3. perde" },
    ],
  },
};

const FINGER_COLORS: Record<number, string> = {
  1: "#22C55E",
  2: "#3B82F6",
  3: "#F97316",
  4: "#EC4899",
};

// ── Main component ────────────────────────────────────────────────────────────
export function ChordDiagram({ chordCode }: { chordCode: "Em" | "Am" | "C" | "D" }) {
  const info = CHORD_INFO[chordCode];
  const [isPlaying, setIsPlaying] = useState(false);
  const [chordLightbox, setChordLightbox] = useState(false);
  const [handLightbox, setHandLightbox] = useState(false);

  const closeAll = useCallback(() => { setChordLightbox(false); setHandLightbox(false); }, []);

  useEffect(() => {
    const anyOpen = chordLightbox || handLightbox;
    if (!anyOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeAll(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [chordLightbox, handLightbox, closeAll]);

  const playChord = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    const audio = new Audio(`${import.meta.env.BASE_URL}sounds/${info.audioFile}`);
    audio.play().catch(() => {});
    setTimeout(() => setIsPlaying(false), 3500);
  };

  const imgSrc = chordImages[chordCode] ?? null;

  return (
    <div className="w-full flex flex-col items-center gap-5 bg-white rounded-[2rem] p-5 shadow-sm">
      <h3 className="text-2xl font-bold text-gray-800">{info.name}</h3>

      <div className="flex flex-row items-start gap-5 w-full">

        {/* ── Chord image (click → lightbox) ──────────────────────────── */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Akor Diyagramı
          </span>
          <button
            onClick={() => setChordLightbox(true)}
            aria-label="Akoru büyüt"
            className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-900 shadow-md cursor-zoom-in hover:border-primary/40 transition-colors"
            style={{ width: 160, height: 200 }}
          >
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={`${chordCode} akoru`}
                draggable={false}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-center text-gray-400 text-xs p-3 leading-relaxed">
                Akor görseli yüklenmedi
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-center pb-1.5">
              <span className="text-[9px] text-gray-400 bg-white/80 rounded-full px-2 py-0.5">Büyüt</span>
            </div>
          </button>
        </div>

        {/* ── Right column: finger guide + hand thumb ──────────────────── */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Parmak Rehberi
          </span>

          {info.fingers.map(({ n, desc }) => (
            <div key={n} className="flex items-center gap-3 bg-gray-50 rounded-xl p-2.5">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: FINGER_COLORS[n] }}
              >
                {n}
              </span>
              <p className="text-sm text-gray-700 leading-snug">{desc}</p>
            </div>
          ))}

          {/* Hand thumbnail */}
          <button
            onClick={() => setHandLightbox(true)}
            aria-label="El pozisyonunu büyüt"
            className="relative mt-1 self-start rounded-xl overflow-hidden border border-gray-100 bg-gray-50 shadow-sm cursor-zoom-in hover:border-primary/30 transition-colors"
            style={{ width: 90, height: 74 }}
          >
            <img src={handImg} alt="El pozisyonu" draggable={false} className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center pb-0.5">
              <span className="text-[8px] text-gray-400 bg-white/80 rounded-full px-1.5 py-0.5">El</span>
            </div>
          </button>
        </div>
      </div>

      {/* ── Play button ──────────────────────────────────────────────────── */}
      <Button size="lg" className="rounded-2xl px-10" onClick={playChord} disabled={isPlaying}>
        <Play className="w-5 h-5 mr-2 fill-current" />
        {isPlaying ? "Çalınıyor…" : "Çal"}
      </Button>

      {/* ── Chord image lightbox ─────────────────────────────────────────── */}
      {createPortal(
        <AnimatePresence>
          {chordLightbox && (
            <motion.div
              className="fixed inset-0 z-[9999] flex items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }} onClick={() => setChordLightbox(false)}
            >
              <motion.div
                className="relative rounded-3xl overflow-hidden bg-gray-900"
                initial={{ scale: 0.72, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.82, opacity: 0 }} transition={{ type: "spring", stiffness: 280, damping: 26 }}
                onClick={e => e.stopPropagation()}
              >
                {imgSrc && (
                  <img src={imgSrc} alt={`${chordCode} akoru`} draggable={false}
                    className="select-none" style={{ maxWidth: "85vw", maxHeight: "80vh", objectFit: "contain" }} />
                )}
              </motion.div>
              <motion.button
                className="absolute top-4 right-4 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white"
                style={{ width: 44, height: 44 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setChordLightbox(false)} aria-label="Kapat"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ── Hand image lightbox ──────────────────────────────────────────── */}
      {createPortal(
        <AnimatePresence>
          {handLightbox && (
            <motion.div
              className="fixed inset-0 z-[9999] flex items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.88)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }} onClick={() => setHandLightbox(false)}
            >
              <motion.div
                style={{ width: "min(90vw, calc(78vh * 1.206), 900px)", height: "min(74vh, calc(90vw / 1.206), 745px)", borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 64px rgba(0,0,0,0.7)", cursor: "zoom-out", flexShrink: 0, background: "#f8f8f4" }}
                initial={{ scale: 0.72, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.82, opacity: 0 }} transition={{ type: "spring", stiffness: 280, damping: 26 }}
                onClick={e => e.stopPropagation()}
              >
                <img src={handImg} alt="Sol El Parmak Rehberi" draggable={false} className="select-none w-full h-full object-contain" />
              </motion.div>
              <motion.button
                className="absolute top-4 right-4 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white"
                style={{ width: 44, height: 44 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setHandLightbox(false)} aria-label="Kapat"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
