import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import handImg from "@assets/ChatGPT_Image_1_May_2026_09_50_42_1777618251403.png";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Finger {
  string: number; // 0 = high e … 5 = low E
  fret: number;   // 1–4
  finger: number; // 1–4
  name: string;
}

interface ChordDef {
  name: string;
  fingers: Finger[];
  audioFile: string; // filename under public/sounds/
}

// ── Chord definitions ─────────────────────────────────────────────────────────
const CHORDS: Record<string, ChordDef> = {
  Em: {
    name: "Mi Minör (Em)",
    fingers: [
      { string: 4, fret: 2, finger: 2, name: "Orta"  },
      { string: 3, fret: 2, finger: 3, name: "Yüzük" },
    ],
    audioFile: "em-chord.mp4",
  },
  Am: {
    name: "La Minör (Am)",
    fingers: [
      { string: 3, fret: 2, finger: 2, name: "Orta"   },
      { string: 2, fret: 2, finger: 3, name: "Yüzük"  },
      { string: 1, fret: 1, finger: 1, name: "İşaret" },
    ],
    audioFile: "am-chord.mp4",
  },
};

// ── Visual constants ──────────────────────────────────────────────────────────
const FINGER_COLORS: Record<number, string> = {
  1: "#22C55E",
  2: "#3B82F6",
  3: "#F97316",
  4: "#EC4899",
};

// String labels (top = low E, bottom = high e) and thicknesses
const STRINGS = [
  { label: "E", thickness: 3.2 },
  { label: "A", thickness: 2.6 },
  { label: "D", thickness: 2.1 },
  { label: "G", thickness: 1.6 },
  { label: "B", thickness: 1.2 },
  { label: "e", thickness: 0.9 },
];

// ── Coordinate helpers ────────────────────────────────────────────────────────
// Horizontal fretboard: fret → X, string → Y
// 6 strings distributed evenly; 4 fret columns
function stringToYPercent(stringNum: number) {
  // stringNum: 5=low E (top) … 0=high e (bottom)
  const idx = 5 - stringNum; // 0 for E, 5 for e
  return ((idx + 0.5) / 6) * 100;
}

function fretToXPercent(fretNum: number) {
  // Center of each fret column (columns: 0–25%, 25–50%, 50–75%, 75–100%)
  return ((fretNum - 0.5) / 4) * 100;
}

// ── Main component ────────────────────────────────────────────────────────────
export function ChordDiagram({ chordCode }: { chordCode: "Em" | "Am" }) {
  const chord = CHORDS[chordCode];
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // ── Keyboard & scroll lock for lightbox ──────────────────────────────────
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeLightbox(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, closeLightbox]);

  // ── Animation + real audio ───────────────────────────────────────────────
  const startAnimation = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setStep(0);

    // 🔊 Ses HEMEN başlasın — await öncesi, kullanıcı etkileşimi penceresi içinde
    const audio = new Audio(`${import.meta.env.BASE_URL}sounds/${chord.audioFile}`);
    audio.play().catch(() => {/* autoplay policy: ignore */});

    // 🎸 Animasyon sesle aynı anda dönsün
    for (let i = 1; i <= chord.fingers.length; i++) {
      await delay(380);
      setStep(i);
    }

    // Sesin bitmesi için bekle (~3s genelde yeterli)
    await delay(3000);
    setIsPlaying(false);
  };

  return (
    <div className="w-full flex flex-col items-center gap-5 bg-white rounded-[2rem] p-5 shadow-sm">
      <h3 className="text-2xl font-bold text-gray-800">{chord.name}</h3>

      {/* ── Main row ───────────────────────────────────────────────────── */}
      <div className="flex flex-row items-start gap-5 w-full">

        {/* ── Hand thumbnail (small, click → lightbox) ───────────────── */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Parmak Rehberi
          </span>

          <button
            onClick={() => setLightboxOpen(true)}
            aria-label="Parmak rehberini büyüt"
            className="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50 shadow-sm cursor-zoom-in focus:outline-none hover:border-primary/30 transition-colors"
            style={{ width: 168, height: 139 }}
          >
            <img
              src={handImg}
              alt="Sol El Parmak Rehberi"
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
            {/* Zoom hint overlay */}
            <div className="absolute inset-x-0 bottom-0 flex justify-center pb-1">
              <span className="text-[9px] text-gray-400 bg-white/80 rounded-full px-2 py-0.5 flex items-center gap-0.5">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
                Büyüt
              </span>
            </div>
          </button>

          {/* Compact finger legend */}
          <div className="flex flex-col gap-1 mt-0.5">
            {[
              { n: 1, label: "İşaret" },
              { n: 2, label: "Orta"   },
              { n: 3, label: "Yüzük"  },
              { n: 4, label: "Serçe"  },
            ].map(({ n, label }) => (
              <span
                key={n}
                className="flex items-center gap-1 text-[10px] font-medium"
                style={{ color: FINGER_COLORS[n] }}
              >
                <span
                  className="inline-flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
                  style={{ width: 14, height: 14, fontSize: 8, background: FINGER_COLORS[n] }}
                >
                  {n}
                </span>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Horizontal fretboard ───────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider self-center">
            Perde Diyagramı
          </span>

          {/* Fret number labels (top) */}
          <div className="flex ml-7">
            {[1, 2, 3, 4].map(f => (
              <div key={f} className="flex-1 text-center text-[10px] font-semibold text-gray-400">
                {f}. Perde
              </div>
            ))}
          </div>

          {/* Fretboard body */}
          <div className="flex items-stretch gap-0">
            {/* String name labels (left) */}
            <div className="flex flex-col justify-around pr-1.5" style={{ width: 26 }}>
              {STRINGS.map(({ label }) => (
                <span key={label} className="text-[10px] font-bold text-gray-500 text-right leading-none">
                  {label}
                </span>
              ))}
            </div>

            {/* Fretboard surface */}
            <div
              className="relative flex-1 bg-[#3E2723] rounded-r-sm border-[3px] border-[#2E1A17]"
              style={{
                height: 168,
                borderLeftWidth: 14,
                borderLeftColor: "#F5F5F5", // nut
              }}
            >
              {/* Fret dividers (vertical lines) */}
              <div className="absolute inset-0 flex">
                {[1, 2, 3].map(f => (
                  <div key={f} className="flex-1 border-r-[2px] border-[#BDBDBD]" />
                ))}
                <div className="flex-1" />
              </div>

              {/* String lines (horizontal) */}
              {STRINGS.map(({ label, thickness }, idx) => {
                const yPct = ((idx + 0.5) / 6) * 100;
                return (
                  <div
                    key={label}
                    className="absolute left-0 right-0 bg-slate-300"
                    style={{
                      top: `${yPct}%`,
                      height: thickness,
                      transform: "translateY(-50%)",
                    }}
                  />
                );
              })}

              {/* Finger dots */}
              {chord.fingers.map((f, i) => {
                const visible = step > i;
                const xPct = fretToXPercent(f.fret);
                const yPct = stringToYPercent(f.string);
                const color = FINGER_COLORS[f.finger] ?? "#6C63FF";
                return (
                  <AnimatePresence key={i}>
                    {visible && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 340, damping: 22 }}
                        className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-lg z-10"
                        style={{
                          left: `${xPct}%`,
                          top: `${yPct}%`,
                          background: color,
                          boxShadow: `0 2px 10px ${color}88`,
                        }}
                      >
                        {f.finger}
                      </motion.div>
                    )}
                  </AnimatePresence>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Play button ──────────────────────────────────────────────────── */}
      <Button
        size="lg"
        className="rounded-2xl px-10"
        onClick={startAnimation}
        disabled={isPlaying}
      >
        <Play className="w-5 h-5 mr-2 fill-current" />
        {isPlaying ? "Çalınıyor…" : "Çal"}
      </Button>

      {/* ── Hand image lightbox ──────────────────────────────────────────── */}
      {createPortal(
        <AnimatePresence>
          {lightboxOpen && (
            <motion.div
              key="chord-lightbox"
              className="fixed inset-0 z-[9999] flex items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.88)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeLightbox}
            >
              {/* landscape container: görsel 1377×1142 oranında */}
              <motion.div
                style={{
                  /* landscape: en fazla 90vw veya 80vh×1.206 (görsel oranı), max 900px */
                  width: "min(90vw, calc(78vh * 1.206), 900px)",
                  height: "min(74vh, calc(90vw / 1.206), 745px)",
                  borderRadius: 20,
                  overflow: "hidden",
                  boxShadow: "0 8px 64px rgba(0,0,0,0.7)",
                  cursor: "zoom-out",
                  flexShrink: 0,
                  background: "#f8f8f4",
                }}
                initial={{ scale: 0.72, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.82, opacity: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 26 }}
                onClick={e => e.stopPropagation()}
              >
                <img
                  src={handImg}
                  alt="Sol El Parmak Rehberi"
                  draggable={false}
                  className="select-none"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </motion.div>

              <motion.button
                className="absolute top-4 right-4 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm text-white transition-colors"
                style={{ width: 44, height: 44 }}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
                onClick={closeLightbox}
                aria-label="Kapat"
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

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}
