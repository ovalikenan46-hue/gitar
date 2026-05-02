import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { chordImages } from "@/utils/chordImages";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChordCard {
  code: string;
  label: string;
  description: string;
}

const CHORD_CARDS: ChordCard[] = [
  { code: "Em", label: "Mi Minör (Em)", description: "2 parmak — A ve D teli, 2. perde" },
  { code: "Am", label: "La Minör (Am)", description: "3 parmak — B, D, G telleri" },
  { code: "C",  label: "Do Majör (C)",  description: "3 parmak — B, D, A telleri" },
  { code: "D",  label: "Re Majör (D)",  description: "3 parmak — G, B, e telleri" },
];

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }} onClick={onClose}
    >
      <motion.div
        className="relative rounded-3xl overflow-hidden bg-gray-900 shadow-2xl"
        initial={{ scale: 0.75, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }} transition={{ type: "spring", stiffness: 280, damping: 26 }}
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

// ── Chord image card ──────────────────────────────────────────────────────────
function ChordImageCard({ card }: { card: ChordCard }) {
  const [open, setOpen] = useState(false);
  const onClose = useCallback(() => setOpen(false), []);
  const src = chordImages[card.code] ?? null;

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-2 cursor-zoom-in group"
        aria-label={`${card.label} akorunu büyüt`}
      >
        <div
          className="rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-900 shadow-md group-hover:border-primary/50 transition-colors relative"
          style={{ width: "100%", aspectRatio: "4/5" }}
        >
          {src ? (
            <img src={src} alt={card.label} draggable={false}
              className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs p-3 text-center leading-relaxed">
              Görsel yüklenmedi
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex justify-center pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[9px] text-gray-300 bg-black/50 rounded-full px-2 py-0.5 backdrop-blur-sm">
              Büyüt
            </span>
          </div>
        </div>
        <div className="text-center">
          <p className="font-bold text-sm text-gray-800">{card.label}</p>
          <p className="text-[10px] text-gray-400 leading-snug">{card.description}</p>
        </div>
      </motion.button>

      <AnimatePresence>
        {open && <Lightbox src={src ?? ""} alt={card.label} onClose={onClose} />}
      </AnimatePresence>
    </>
  );
}

// ── Ritim image card ──────────────────────────────────────────────────────────
function RitimCard() {
  const [open, setOpen] = useState(false);
  const onClose = useCallback(() => setOpen(false), []);
  const src = chordImages.ritim;

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(true)}
        className="w-full cursor-zoom-in group"
        aria-label="Ritim kalıbını büyüt"
      >
        <div className="rounded-2xl overflow-hidden border-2 border-gray-200 bg-white shadow-md group-hover:border-primary/50 transition-colors relative">
          <img src={src} alt="Ritim Kalıbı — 2 Aşağı 2 Yukarı 1 Aşağı 1 Yukarı"
            draggable={false} className="w-full object-contain" style={{ maxHeight: 200 }} />
          <div className="absolute inset-x-0 bottom-0 flex justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[9px] text-gray-600 bg-white/80 rounded-full px-2 py-0.5">Büyüt</span>
          </div>
        </div>
        <p className="text-center text-sm font-bold text-gray-800 mt-2">Ritim Kalıbı</p>
        <p className="text-center text-[10px] text-gray-400">2 Aşağı · 2 Yukarı · 1 Aşağı · 1 Yukarı</p>
      </motion.button>

      <AnimatePresence>
        {open && <Lightbox src={src} alt="Ritim Kalıbı" onClose={onClose} />}
      </AnimatePresence>
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
interface ChordReferenceProps {
  /** Which chords to show. Defaults to all 4. */
  chords?: Array<"Em" | "Am" | "C" | "D">;
  /** Show the rhythm pattern image below chord grid. Default true. */
  showRitim?: boolean;
}

export function ChordReference({ chords, showRitim = true }: ChordReferenceProps) {
  const cards = chords
    ? CHORD_CARDS.filter(c => chords.includes(c.code as "Em" | "Am" | "C" | "D"))
    : CHORD_CARDS;

  return (
    <div className="w-full flex flex-col gap-5 bg-white rounded-[2rem] p-5 shadow-sm">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800">Akor Görselleri</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Görsele tıklayarak büyütebilirsin</p>
      </div>

      {/* Chord image grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(cards.length, 4)}, 1fr)` }}>
        {cards.map(card => (
          <ChordImageCard key={card.code} card={card} />
        ))}
      </div>

      {/* Rhythm pattern */}
      {showRitim && (
        <>
          <div className="border-t border-gray-100" />
          <RitimCard />
        </>
      )}
    </div>
  );
}
