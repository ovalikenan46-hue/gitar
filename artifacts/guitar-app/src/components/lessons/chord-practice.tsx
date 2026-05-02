import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Metronome } from "@/components/lessons/metronome";
import { chordImages } from "@/utils/chordImages";

// ── Types ─────────────────────────────────────────────────────────────────────
type ChordCode = "Em" | "Am" | "C" | "D";

const CHORD_LABELS: Record<ChordCode, string> = {
  Em: "Mi Minör",
  Am: "La Minör",
  C:  "Do Majör",
  D:  "Re Majör",
};

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }} onClick={onClose}
    >
      <motion.div
        className="relative rounded-3xl overflow-hidden bg-gray-900 shadow-2xl"
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

// ── Single chord card ─────────────────────────────────────────────────────────
function ChordCard({ code }: { code: ChordCode }) {
  const [open, setOpen] = useState(false);
  const onClose = useCallback(() => setOpen(false), []);
  const src = chordImages[code];

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-2 cursor-zoom-in group w-full"
        aria-label={`${CHORD_LABELS[code]} akorunu büyüt`}
      >
        {/* Badge */}
        <span
          className="px-3 py-0.5 rounded-full text-white font-black text-base shadow-sm"
          style={{ background: "var(--color-primary, #6C63FF)" }}
        >
          {code}
        </span>

        {/* Image */}
        <div
          className="w-full rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-900 shadow-md group-hover:border-primary/50 transition-colors relative"
          style={{ aspectRatio: "3/4" }}
        >
          <img
            src={src}
            alt={CHORD_LABELS[code]}
            draggable={false}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex justify-center pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[9px] text-gray-200 bg-black/50 rounded-full px-2 py-0.5 backdrop-blur-sm">Büyüt</span>
          </div>
        </div>

        {/* Label */}
        <p className="text-[11px] font-semibold text-gray-500 text-center leading-tight">{CHORD_LABELS[code]}</p>
      </motion.button>

      <AnimatePresence>
        {open && <Lightbox src={src} alt={CHORD_LABELS[code]} onClose={onClose} />}
      </AnimatePresence>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface ChordPracticeProps {
  /** Exactly 3 chord codes — displayed left to right */
  chords: [ChordCode, ChordCode, ChordCode];
}

export function ChordPractice({ chords }: ChordPracticeProps) {
  const [activePlayer, setActivePlayer] = useState<"metronome" | null>(null);

  return (
    <div className="w-full flex flex-col gap-6">

      {/* Section title */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 rounded-2xl px-4 py-2">
          <span className="text-primary font-black text-lg">{chords.join(" → ")}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Görsele tıklayarak akorları büyütebilirsin
        </p>
      </div>

      {/* 3 chord images */}
      <div className="bg-white rounded-[2rem] p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-3">
          {chords.map(code => (
            <ChordCard key={code} code={code} />
          ))}
        </div>
      </div>

      {/* Arrow flow hint */}
      <div className="flex items-center justify-center gap-2">
        {chords.map((c, i) => (
          <div key={c} className="flex items-center gap-2">
            <span className="font-black text-primary text-sm">{c}</span>
            {i < chords.length - 1 && (
              <svg width="18" height="14" viewBox="0 0 18 14" className="text-muted-foreground/50 flex-shrink-0">
                <path d="M1 7h14M10 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            )}
          </div>
        ))}
        <span className="text-xs text-muted-foreground ml-1">geçiş pratiği</span>
      </div>

      {/* Metronome */}
      <Metronome
        isActive={activePlayer !== null}
        onActivate={() => setActivePlayer("metronome")}
        onDeactivate={() => setActivePlayer(null)}
      />

    </div>
  );
}
