import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playNote } from "@/lib/audio";

const strings = [
  { id: 0, name: "e", openMidi: 64, color: "bg-slate-300", height: "h-[2px]" },
  { id: 1, name: "B", openMidi: 59, color: "bg-slate-400", height: "h-[3px]" },
  { id: 2, name: "G", openMidi: 55, color: "bg-slate-500", height: "h-[4px]" },
  { id: 3, name: "D", openMidi: 50, color: "bg-amber-600", height: "h-[5px]" },
  { id: 4, name: "A", openMidi: 45, color: "bg-amber-700", height: "h-[6px]" },
  { id: 5, name: "E", openMidi: 40, color: "bg-amber-800", height: "h-[8px]" },
];

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function getNoteName(midi: number) {
  return NOTE_NAMES[midi % 12];
}

const FRET_COUNT = 12; // 0 (açık) + 12 perde

export function Fretboard() {
  const [activeNote, setActiveNote] = useState<{ s: number; f: number; name: string } | null>(null);

  const handlePlay = (stringId: number, fret: number, openMidi: number) => {
    const midi = openMidi + fret;
    const name = getNoteName(midi);
    setActiveNote({ s: stringId, f: fret, name });
    playNote({ midi, duration: 2, stringId });
    setTimeout(() => {
      setActiveNote((prev) => (prev?.s === stringId && prev?.f === fret) ? null : prev);
    }, 1000);
  };

  return (
    <div className="w-full flex flex-col gap-5">

      {/* Açık tel düğmeleri */}
      <div className="bg-muted rounded-2xl p-3 sm:p-4">
        <p className="font-bold text-muted-foreground text-xs mb-3 uppercase tracking-wider">Akort (Açık Teller)</p>
        <div className="flex gap-2 justify-around">
          {strings.slice().reverse().map(s => (
            <button
              key={s.id}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow-sm font-bold text-base sm:text-lg hover:bg-primary hover:text-white active:scale-95 transition-all touch-manipulation"
              onClick={() => handlePlay(s.id, 0, s.openMidi)}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Klavye — yatay kaydırmalı */}
      <div className="relative">
        <div className="w-full overflow-x-auto pb-8 rounded-xl" style={{ WebkitOverflowScrolling: "touch" }}>
          <div
            className="bg-[#3E2723] rounded-xl p-3 sm:p-4 relative shadow-inner border-[6px] sm:border-[8px] border-[#2E1A17]"
            style={{ minWidth: 520 }}
          >
            {/* Perde çizgileri ve noktaları */}
            <div className="absolute top-0 bottom-0 left-0 right-0 flex pointer-events-none">
              {[...Array(FRET_COUNT + 1)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 border-r-2 border-[#BDBDBD] h-full relative ${i === 0 ? "border-r-[8px] border-[#F5F5F5]" : ""}`}
                >
                  {[3, 5, 7, 9].includes(i) && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white/20" />
                  )}
                  {i === 12 && (
                    <>
                      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white/20" />
                      <div className="absolute top-3/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white/20" />
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Teller */}
            <div className="relative z-10 flex flex-col justify-between" style={{ height: 180 }}>
              {strings.map((str) => (
                <div key={str.id} className="relative flex items-center h-full group">
                  <div className={`absolute left-[-12px] right-[-12px] shadow-sm ${str.height} ${str.color}`} />
                  <div className="absolute inset-0 flex">
                    {[...Array(FRET_COUNT + 1)].map((_, fret) => (
                      <div
                        key={fret}
                        className="flex-1 flex items-center justify-center cursor-pointer hover:bg-white/10 active:bg-white/20 transition-colors touch-manipulation"
                        onClick={() => handlePlay(str.id, fret, str.openMidi)}
                      >
                        <AnimatePresence>
                          {activeNote?.s === str.id && activeNote?.f === fret && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 1.5, opacity: 0 }}
                              className="absolute w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/80 shadow-[0_0_15px_rgba(108,99,255,0.8)] backdrop-blur-sm z-20 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold"
                            >
                              {activeNote.name}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Perde numaraları */}
            <div className="absolute left-0 right-0 flex px-3 sm:px-4" style={{ bottom: -28 }}>
              {[...Array(FRET_COUNT + 1)].map((_, i) => (
                <div key={i} className="flex-1 text-center text-[10px] sm:text-xs font-bold text-muted-foreground">
                  {i}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Kaydırma ipucu — sadece sağ kenar gradient */}
        <div
          className="absolute right-0 top-0 bottom-8 w-8 pointer-events-none rounded-r-xl"
          style={{ background: "linear-gradient(to right, transparent, rgba(0,0,0,0.12))" }}
        />
        <p className="text-center text-[10px] text-muted-foreground mt-1">← Kaydırarak tüm perdeleri gör →</p>
      </div>
    </div>
  );
}
