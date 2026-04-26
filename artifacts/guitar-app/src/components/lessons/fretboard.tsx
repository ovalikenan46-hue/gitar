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

export function Fretboard() {
  const [activeNote, setActiveNote] = useState<{s: number, f: number, name: string} | null>(null);

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
    <div className="w-full flex flex-col gap-6">
      
      <div className="flex justify-between items-center bg-muted p-4 rounded-2xl">
        <span className="font-bold text-muted-foreground text-sm">Akort (Açık Teller)</span>
        <div className="flex gap-2">
          {strings.slice().reverse().map(s => (
            <button 
              key={s.id} 
              className="w-10 h-10 rounded-full bg-white shadow-sm font-bold text-lg hover:bg-primary hover:text-white transition-colors"
              onClick={() => handlePlay(s.id, 0, s.openMidi)}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
        <div className="min-w-[800px] bg-[#3E2723] rounded-xl p-4 relative shadow-inner border-[8px] border-[#2E1A17]">
          {/* Fret markers */}
          <div className="absolute top-0 bottom-0 left-0 right-0 flex pointer-events-none">
            {[...Array(13)].map((_, i) => (
              <div key={i} className={`flex-1 border-r-2 border-[#BDBDBD] h-full ${i===0 ? 'border-r-[8px] border-[#F5F5F5]' : ''} relative`}>
                {/* Dots */}
                {([3, 5, 7, 9].includes(i)) && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/20" />}
                {(i === 12) && (
                  <>
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/20" />
                    <div className="absolute top-3/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/20" />
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Strings */}
          <div className="relative z-10 flex flex-col justify-between h-[200px]">
            {strings.map((str) => (
              <div key={str.id} className="relative flex items-center h-full group">
                <div className={`absolute left-[-16px] right-[-16px] shadow-sm ${str.height} ${str.color}`} />
                <div className="absolute inset-0 flex">
                  {[...Array(13)].map((_, fret) => (
                    <div 
                      key={fret} 
                      className="flex-1 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => handlePlay(str.id, fret, str.openMidi)}
                    >
                      <AnimatePresence>
                        {activeNote?.s === str.id && activeNote?.f === fret && (
                          <motion.div 
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            className="absolute w-8 h-8 rounded-full bg-primary/80 shadow-[0_0_15px_rgba(108,99,255,0.8)] backdrop-blur-sm z-20 flex items-center justify-center text-white text-xs font-bold"
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
          
          {/* Fret numbers */}
          <div className="absolute -bottom-8 left-0 right-0 flex px-4">
            {[...Array(13)].map((_, i) => (
               <div key={i} className="flex-1 text-center text-xs font-bold text-muted-foreground">{i}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
