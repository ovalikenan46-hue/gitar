import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chordImages } from "@/utils/chordImages";

// ── Chord metadata ────────────────────────────────────────────────────────────
type ChordCode = "E" | "A" | "Dm" | "G" | "F" | "B7";

const CHORD_META: Record<ChordCode, { label: string; sub: string; audio: string }> = {
  E:  { label: "Mi Majör",         sub: "E Major",  audio: "chords/E.mp4"  },
  A:  { label: "La Majör",         sub: "A Major",  audio: "chords/A.mp4"  },
  Dm: { label: "Re Minör",         sub: "D Minor",  audio: "chords/Dm.mp4" },
  G:  { label: "Sol Majör",        sub: "G Major",  audio: "chords/G.mp4"  },
  F:  { label: "Fa Majör (Barre)", sub: "F Major",  audio: "chords/F.mp4"  },
  B7: { label: "Si 7",             sub: "B7",       audio: "chords/B7.mp4" },
};

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }} onClick={onClose}
    >
      <motion.div
        className="relative rounded-3xl overflow-hidden shadow-2xl bg-gray-900"
        initial={{ scale: 0.72, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.84, opacity: 0 }} transition={{ type: "spring", stiffness: 280, damping: 26 }}
        onClick={e => e.stopPropagation()}
      >
        <img src={src} alt={alt} draggable={false}
          className="select-none block"
          style={{ maxWidth: "88vw", maxHeight: "82vh", objectFit: "contain" }} />
      </motion.div>
      <motion.button
        className="absolute top-4 right-4 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors"
        style={{ width: 44, height: 44 }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} aria-label="Kapat"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </motion.button>
    </motion.div>,
    document.body,
  );
}

// ── Single chord card — same visual language as ChordDiagram ─────────────────
function ChordCard({ code }: { code: ChordCode }) {
  const meta = CHORD_META[code];
  const src = chordImages[code] ?? "";
  const [lightbox, setLightbox] = useState(false);
  const [playing, setPlaying] = useState(false);
  const onClose = useCallback(() => setLightbox(false), []);

  const handlePlay = () => {
    const audio = new Audio(`${import.meta.env.BASE_URL}sounds/${meta.audio}`);
    audio.play().catch(() => {});
    setPlaying(true);
    audio.onended = () => setPlaying(false);
  };

  return (
    <>
      <div className="w-full flex flex-col items-center gap-5 bg-white rounded-[2rem] p-5 shadow-sm">
        {/* Title */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-800">{meta.label}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{meta.sub}</p>
        </div>

        {/* Chord image — clickable to zoom */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setLightbox(true)}
          className="w-full cursor-zoom-in group relative rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-900 shadow-md hover:border-primary/40 transition-colors"
          style={{ aspectRatio: "3/4", maxWidth: 280 }}
          aria-label={`${meta.label} büyüt`}
        >
          <img
            src={src}
            alt={meta.label}
            draggable={false}
            className="w-full h-full object-cover"
          />
          {/* hover hint */}
          <div className="absolute inset-x-0 bottom-0 flex justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-gray-200 bg-black/50 rounded-full px-2.5 py-0.5 backdrop-blur-sm flex items-center gap-1">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
              Büyüt
            </span>
          </div>
        </motion.button>

        {/* Play button */}
        <Button
          size="lg"
          className="rounded-2xl px-10"
          onClick={handlePlay}
          disabled={playing}
        >
          <Play className="w-5 h-5 mr-2 fill-current" />
          {playing ? "Çalınıyor…" : "Çal"}
        </Button>
      </div>

      <AnimatePresence>
        {lightbox && <Lightbox src={src} alt={meta.label} onClose={onClose} />}
      </AnimatePresence>
    </>
  );
}

// ── Main component — two chords per section ───────────────────────────────────
interface ChordSectionProps {
  chords: [ChordCode, ChordCode];
}

export function ChordSection({ chords }: ChordSectionProps) {
  return (
    <div className="w-full flex flex-col gap-6">
      {chords.map(code => (
        <ChordCard key={code} code={code} />
      ))}
    </div>
  );
}
