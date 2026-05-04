import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
const BASE = import.meta.env.BASE_URL;
const songMp3   = `${BASE}song/song.mp3`;
const sheetImg  = `${BASE}song/song-sheet.png`;

// ── Chord sequence ─────────────────────────────────────────────────────────────
// 4/4 zaman, 100 BPM → 1 ölçü = 2.4 saniye
interface ChordCue {
  time: number;
  chord: string;
}

const CHORD_SEQUENCE: ChordCue[] = [
  // Bölüm 1: Em x2 — C x2
  { time: 0.0,   chord: "Em" },
  { time: 4.8,   chord: "C"  },
  // Bölüm 2: (Em x2 — D x1 — C x1) x2
  { time: 9.6,   chord: "Em" },
  { time: 14.4,  chord: "D"  },
  { time: 16.8,  chord: "C"  },
  { time: 19.2,  chord: "Em" },
  { time: 24.0,  chord: "D"  },
  { time: 26.4,  chord: "C"  },
  // Bölüm 3: Em x2 — C x2 — D x2
  { time: 28.8,  chord: "Em" },
  { time: 33.6,  chord: "C"  },
  { time: 38.4,  chord: "D"  },
  // Bölüm 4: (Em x2 — C x1 — D x1) x2
  { time: 43.2,  chord: "Em" },
  { time: 48.0,  chord: "C"  },
  { time: 50.4,  chord: "D"  },
  { time: 52.8,  chord: "Em" },
  { time: 57.6,  chord: "C"  },
  { time: 60.0,  chord: "D"  },
  // Bölüm 5: Em x2 — Am x2 — C x2
  { time: 62.4,  chord: "Em" },
  { time: 67.2,  chord: "Am" },
  { time: 72.0,  chord: "C"  },
  // Bölüm 6: (Em x2 — D x1 — C x1) x5
  { time: 76.8,  chord: "Em" },
  { time: 81.6,  chord: "D"  },
  { time: 84.0,  chord: "C"  },
  { time: 86.4,  chord: "Em" },
  { time: 91.2,  chord: "D"  },
  { time: 93.6,  chord: "C"  },
  { time: 96.0,  chord: "Em" },
  { time: 100.8, chord: "D"  },
  { time: 103.2, chord: "C"  },
  { time: 105.6, chord: "Em" },
  { time: 110.4, chord: "D"  },
  { time: 112.8, chord: "C"  },
  { time: 115.2, chord: "Em" },
  { time: 120.0, chord: "D"  },
  { time: 122.4, chord: "C"  },
  // Bölüm 7: Em x3
  { time: 124.8, chord: "Em" },
];

const CHORD_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  Em: { bg: "#22C55E", text: "#fff", glow: "#22C55E66" },
  Am: { bg: "#8B5CF6", text: "#fff", glow: "#8B5CF666" },
  C:  { bg: "#3B82F6", text: "#fff", glow: "#3B82F666" },
  D:  { bg: "#F97316", text: "#fff", glow: "#F9731666" },
};

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function getCurrentChordIndex(time: number): number {
  let idx = 0;
  for (let i = 0; i < CHORD_SEQUENCE.length; i++) {
    if (CHORD_SEQUENCE[i].time <= time) idx = i;
    else break;
  }
  return idx;
}

export function SongPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [chordIdx, setChordIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    const audio = new Audio(songMp3);
    audio.preload = "auto";
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    });

    return () => {
      audio.pause();
      audio.src = "";
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = audio.currentTime;
    setCurrentTime(t);
    setChordIdx(getCurrentChordIndex(t));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      rafRef.current = requestAnimationFrame(tick);
      setIsPlaying(true);
    }
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    setChordIdx(0);
    if (isPlaying) {
      audio.play().catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
    setChordIdx(getCurrentChordIndex(t));
  };

  const currentCue = CHORD_SEQUENCE[chordIdx];
  const nextCue = CHORD_SEQUENCE[chordIdx + 1];
  const chordColor = CHORD_COLORS[currentCue?.chord] ?? { bg: "#6C63FF", text: "#fff", glow: "#6C63FF44" };
  const progress = duration > 0 ? currentTime / duration : 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxOpen(false); };
    if (lightboxOpen) {
      window.addEventListener("keydown", handler);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  return (
    <div className="w-full flex flex-col items-center gap-5 bg-white rounded-[2rem] p-5 shadow-sm">
      <h3 className="text-2xl font-bold text-gray-800">🎵 Şarkı ile Çal</h3>

      {/* Chord sheet thumbnail */}
      <button
        onClick={() => setLightboxOpen(true)}
        aria-label="Nota sayfasını büyüt"
        className="w-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm cursor-zoom-in hover:border-primary/30 transition-colors"
      >
        <img
          src={sheetImg}
          alt="Nota Sayfası"
          className="w-full object-contain"
          style={{ maxHeight: 220 }}
          draggable={false}
        />
        <div className="py-1.5 text-center text-[10px] text-gray-400 bg-gray-50">
          Büyütmek için tıkla
        </div>
      </button>

      {/* Current chord display */}
      <div className="w-full flex flex-col items-center gap-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Şu Anki Akor</p>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCue?.chord ?? "—"}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="flex items-center justify-center rounded-3xl font-black text-7xl"
            style={{
              width: "100%",
              height: 120,
              background: chordColor.bg,
              color: chordColor.text,
              boxShadow: `0 8px 40px ${chordColor.glow}`,
              letterSpacing: "-2px",
            }}
          >
            {currentCue?.chord ?? "—"}
          </motion.div>
        </AnimatePresence>

        {/* Upcoming chord */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Sıradaki:</span>
          {nextCue ? (
            <span
              className="font-bold px-2 py-0.5 rounded-lg text-white"
              style={{ background: CHORD_COLORS[nextCue.chord]?.bg ?? "#6C63FF" }}
            >
              {nextCue.chord}
            </span>
          ) : (
            <span className="italic">—</span>
          )}
        </div>
      </div>

      {/* Chord strip */}
      <div className="w-full overflow-x-auto flex gap-2 pb-1">
        {CHORD_SEQUENCE.map((cue, i) => {
          const col = CHORD_COLORS[cue.chord];
          const isActive = i === chordIdx;
          const isPast = i < chordIdx;
          return (
            <div
              key={i}
              className="flex-shrink-0 px-2 py-1 rounded-lg text-xs font-bold transition-all duration-200"
              style={{
                background: isActive ? col?.bg : isPast ? "#F1F5F9" : "#F8FAFC",
                color: isActive ? "#fff" : isPast ? "#94A3B8" : "#475569",
                transform: isActive ? "scale(1.12)" : "scale(1)",
                opacity: isPast ? 0.45 : 1,
              }}
            >
              {cue.chord}
            </div>
          );
        })}
      </div>

      {/* Audio controls */}
      <div className="w-full flex flex-col gap-3">
        {/* Time display */}
        <div className="flex justify-between text-xs font-mono text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span className="text-[10px] font-semibold text-gray-400 uppercase">4/4 • 100 BPM</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Progress bar */}
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full accent-primary h-2 rounded-full cursor-pointer"
          style={{ accentColor: chordColor.bg }}
        />

        {/* Buttons */}
        <div className="flex gap-3 justify-center">
          <Button variant="outline" size="icon" className="rounded-xl" onClick={restart}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            size="lg"
            className="rounded-2xl px-10 font-bold"
            style={{ background: chordColor.bg, color: chordColor.text, boxShadow: `0 4px 20px ${chordColor.glow}` }}
            onClick={togglePlay}
          >
            {isPlaying
              ? <><Pause className="w-5 h-5 mr-2 fill-current" /> Duraklat</>
              : <><Play className="w-5 h-5 mr-2 fill-current" /> Çal</>
            }
          </Button>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightboxOpen(false)}
          >
            <motion.div
              style={{ width: "min(90vw, 500px)", borderRadius: 20, overflow: "hidden", background: "#fff", cursor: "zoom-out" }}
              initial={{ scale: 0.75, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }} transition={{ type: "spring", stiffness: 280, damping: 26 }}
              onClick={e => e.stopPropagation()}
            >
              <img src={sheetImg} alt="Nota Sayfası" className="w-full object-contain" draggable={false} />
            </motion.div>
            <motion.button
              className="absolute top-4 right-4 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white"
              style={{ width: 44, height: 44 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setLightboxOpen(false)} aria-label="Kapat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
