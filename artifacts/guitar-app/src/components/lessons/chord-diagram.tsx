import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { playNote } from "@/lib/audio";

interface Finger {
  string: number; // 0-5 (e to E)
  fret: number;   // 1-4
  finger: number; // 1-4
  name: string;
}

interface ChordDef {
  name: string;
  fingers: Finger[];
  arpeggio: number[]; // midis
}

const CHORDS: Record<string, ChordDef> = {
  "Em": {
    name: "Mi Minör (Em)",
    fingers: [
      { string: 4, fret: 2, finger: 2, name: "Orta" },
      { string: 3, fret: 2, finger: 3, name: "Yüzük" },
    ],
    arpeggio: [40, 47, 52, 55, 59, 64] // E2, B2, E3, G3, B3, E4
  },
  "Am": {
    name: "La Minör (Am)",
    fingers: [
      { string: 3, fret: 2, finger: 2, name: "Orta" },
      { string: 2, fret: 2, finger: 3, name: "Yüzük" },
      { string: 1, fret: 1, finger: 1, name: "İşaret" },
    ],
    arpeggio: [45, 52, 57, 60, 64] // A2, E3, A3, C4, E4
  }
};

export function ChordDiagram({ chordCode }: { chordCode: "Em" | "Am" }) {
  const chord = CHORDS[chordCode];
  const [step, setStep] = useState(0); // 0 = empty, 1..n = fingers placed
  const [isPlaying, setIsPlaying] = useState(false);

  const startAnimation = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setStep(0);
    
    // Place fingers one by one
    for (let i = 1; i <= chord.fingers.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      setStep(i);
    }
    
    // Play strum
    await new Promise(r => setTimeout(r, 400));
    
    chord.arpeggio.forEach((midi, i) => {
      setTimeout(() => {
        playNote({ midi, duration: 2 });
      }, i * 50); // fast arpeggio = strum
    });

    await new Promise(r => setTimeout(r, 2000));
    setIsPlaying(false);
  };

  return (
    <div className="w-full flex flex-col items-center gap-8 bg-white rounded-[2rem] p-8 shadow-sm">
      <h3 className="text-2xl font-bold">{chord.name}</h3>
      
      {/* Vertical Fretboard */}
      <div className="relative w-48 h-64 bg-[#3E2723] rounded-t-sm border-[6px] border-[#2E1A17] border-t-[12px] border-t-[#F5F5F5]">
        
        {/* Frets (horizontal lines) */}
        <div className="absolute inset-0 flex flex-col">
          {[1,2,3,4].map(f => (
            <div key={f} className="flex-1 border-b-[3px] border-[#BDBDBD]" />
          ))}
        </div>

        {/* Strings (vertical lines) */}
        <div className="absolute inset-0 flex justify-between px-2">
          {[5,4,3,2,1,0].map(s => (
            <div key={s} className="w-[3px] h-full bg-slate-300 shadow-sm" />
          ))}
        </div>

        {/* Fingers */}
        {chord.fingers.map((f, i) => {
          const isVisible = step > i;
          
          // Map string 0-5 to x position (0 is rightmost e string, 5 is leftmost E string)
          // 6 strings = 5 intervals. 
          const xPercent = ((5 - f.string) / 5) * 100;
          
          // Map fret 1-4 to y position (center of the fret block)
          // 4 frets = 25% height each. Center is f * 25 - 12.5
          const yPercent = (f.fret * 25) - 12.5;

          return (
            <AnimatePresence key={i}>
              {isVisible && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute w-8 h-8 -ml-4 -mt-4 bg-primary text-white rounded-full flex items-center justify-center font-bold shadow-lg z-10"
                  style={{ left: `calc(${xPercent}%)`, top: `${yPercent}%` }}
                >
                  {f.finger}
                </motion.div>
              )}
            </AnimatePresence>
          );
        })}
      </div>

      <Button 
        size="lg" 
        className="rounded-2xl px-8" 
        onClick={startAnimation}
        disabled={isPlaying}
      >
        <Play className="w-5 h-5 mr-2 fill-current" /> {isPlaying ? "Çalınıyor..." : "Oynat"}
      </Button>
    </div>
  );
}
