import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { playGuitarString } from "@/lib/audio";
import handImg from "@assets/ChatGPT_Image_1_May_2026_09_50_42_1777618251403.png";

interface Finger {
  string: number; // 0-5  (0 = high e, 5 = low E)
  fret: number;   // 1-4
  finger: number; // 1-4
  name: string;
}

interface ChordDef {
  name: string;
  fingers: Finger[];
  // MIDI notes low → high (one per sounding string)
  arpeggio: number[];
}

// ── Chord definitions ────────────────────────────────────────────────────────
// Em: E2-B2-E3-G3-B3-E4   (all 6 strings, open)
// Am: A2-E3-A3-C4-E4      (5 strings, low E muted)
const CHORDS: Record<string, ChordDef> = {
  Em: {
    name: "Mi Minör (Em)",
    fingers: [
      { string: 4, fret: 2, finger: 2, name: "Orta" },
      { string: 3, fret: 2, finger: 3, name: "Yüzük" },
    ],
    arpeggio: [40, 47, 52, 55, 59, 64],
  },
  Am: {
    name: "La Minör (Am)",
    fingers: [
      { string: 3, fret: 2, finger: 2, name: "Orta" },
      { string: 2, fret: 2, finger: 3, name: "Yüzük" },
      { string: 1, fret: 1, finger: 1, name: "İşaret" },
    ],
    arpeggio: [45, 52, 57, 60, 64],
  },
};

// Finger-dot colours
const FINGER_COLORS: Record<number, string> = {
  1: "#22C55E",  // green  – index
  2: "#3B82F6",  // blue   – middle
  3: "#F97316",  // orange – ring
  4: "#EC4899",  // pink   – pinky
};

export function ChordDiagram({ chordCode }: { chordCode: "Em" | "Am" }) {
  const chord = CHORDS[chordCode];
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const startAnimation = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setStep(0);

    // Place fingers one by one
    for (let i = 1; i <= chord.fingers.length; i++) {
      await delay(500);
      setStep(i);
    }

    // Brief pause then strum
    await delay(350);

    // Strum: low → high with 40 ms per string (guitar-realistic)
    chord.arpeggio.forEach((midi, i) => {
      setTimeout(() => {
        playGuitarString({ midi, duration: 4.5, velocity: 0.68 - i * 0.02, stringId: i });
      }, i * 40);
    });

    await delay(5000);
    setIsPlaying(false);
  };

  return (
    <div className="w-full flex flex-col items-center gap-6 bg-white rounded-[2rem] p-6 shadow-sm">
      <h3 className="text-2xl font-bold text-gray-800">{chord.name}</h3>

      {/* ── Main row: hand guide + fretboard ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full">

        {/* ── Left El Rehberi (rotated 90° clockwise → horizontal, sap başlangıç sağda) */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Parmak Rehberi
          </span>
          <div
            className="relative overflow-hidden rounded-2xl border border-gray-100 shadow-sm bg-gray-50"
            style={{ width: 240, height: 240 }}
          >
            <img
              src={handImg}
              alt="Sol El Parmak Rehberi"
              draggable={false}
              style={{
                width: 240,
                height: 240,
                objectFit: "contain",
                transform: "rotate(90deg)",
                transformOrigin: "center center",
              }}
            />
          </div>
          {/* Finger legend */}
          <div className="flex gap-2 flex-wrap justify-center mt-1">
            {[
              { n: 1, label: "İşaret" },
              { n: 2, label: "Orta" },
              { n: 3, label: "Yüzük" },
              { n: 4, label: "Serçe" },
            ].map(({ n, label }) => (
              <span
                key={n}
                className="flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5"
                style={{ background: FINGER_COLORS[n] + "22", color: FINGER_COLORS[n] }}
              >
                <span
                  className="inline-flex items-center justify-center rounded-full text-white font-bold"
                  style={{ width: 16, height: 16, fontSize: 10, background: FINGER_COLORS[n] }}
                >
                  {n}
                </span>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Right: Fretboard diagram ─────────────────────────────────────── */}
        <div className="flex-shrink-0 flex flex-col items-center gap-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Perde Diyagramı
          </span>

          {/* Nut label */}
          <div className="flex items-center gap-3 w-full justify-center">
            <span className="text-[10px] text-gray-400 font-medium">KABA</span>
            <div className="flex gap-[18px]">
              {["E","A","D","G","B","e"].map(s => (
                <span key={s} className="text-[10px] font-bold text-gray-500 w-4 text-center">{s}</span>
              ))}
            </div>
            <span className="text-[10px] text-gray-400 font-medium">İNCE</span>
          </div>

          {/* Fretboard */}
          <div
            className="relative bg-[#3E2723] border-[6px] border-[#2E1A17] rounded-b-sm"
            style={{ width: 192, height: 256, borderTopWidth: 14, borderTopColor: "#F5F5F5" }}
          >
            {/* Fret lines */}
            <div className="absolute inset-0 flex flex-col">
              {[1, 2, 3, 4].map(f => (
                <div key={f} className="flex-1 border-b-[3px] border-[#BDBDBD]" />
              ))}
            </div>

            {/* Strings */}
            <div className="absolute inset-0 flex justify-between px-2">
              {[5, 4, 3, 2, 1, 0].map(s => (
                <div key={s} className="w-[3px] h-full bg-slate-300 shadow-sm" />
              ))}
            </div>

            {/* Fret-number labels */}
            <div className="absolute right-[-22px] top-0 h-full flex flex-col">
              {[1, 2, 3, 4].map(f => (
                <div key={f} className="flex-1 flex items-center">
                  <span className="text-[10px] text-gray-400 font-medium">{f}</span>
                </div>
              ))}
            </div>

            {/* Finger dots */}
            {chord.fingers.map((f, i) => {
              const visible = step > i;
              const xPercent = ((5 - f.string) / 5) * 100;
              const yPercent = (f.fret * 25) - 12.5;
              const color = FINGER_COLORS[f.finger] ?? "#6C63FF";
              return (
                <AnimatePresence key={i}>
                  {visible && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 22 }}
                      className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center font-bold text-white shadow-lg z-10 text-sm"
                      style={{
                        left: `calc(${xPercent}%)`,
                        top: `${yPercent}%`,
                        background: color,
                        boxShadow: `0 2px 12px ${color}88`,
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

      {/* ── Play button ───────────────────────────────────────────────────── */}
      <Button
        size="lg"
        className="rounded-2xl px-10 mt-2"
        onClick={startAnimation}
        disabled={isPlaying}
      >
        <Play className="w-5 h-5 mr-2 fill-current" />
        {isPlaying ? "Çalınıyor…" : "Çal"}
      </Button>
    </div>
  );
}

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}
