import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, Square, RefreshCcw } from "lucide-react";
import { playNote } from "@/lib/audio";

const PATTERN = [
  { dir: "down", count: "1" },
  { dir: "down", count: "2" },
  { dir: "up",   count: "3" },
  { dir: "up",   count: "4" },
  { dir: "down", count: "1" },
  { dir: "up",   count: "2" },
];

const BPM_OPTIONS = [65, 80, 95, 115] as const;
type BpmValue = (typeof BPM_OPTIONS)[number];

export function StrumPattern() {
  const [isPlaying, setIsPlaying]       = useState(false);
  const [currentBeat, setCurrentBeat]   = useState(-1);
  const [selectedBPM, setSelectedBPM]   = useState<BpmValue>(80);

  /* Keep a ref to the timer so we can clear it instantly on BPM change */
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const beatRef     = useRef(-1);

  /* Stable tick function — plays note and advances beat */
  const tick = useCallback(() => {
    beatRef.current = (beatRef.current + 1) % PATTERN.length;
    const next = beatRef.current;

    /* Accent beat 0 (first beat of the bar) with a higher-pitched note */
    if (next === 0) {
      playNote({ midi: 81, duration: 0.08 });   // strong beat
    } else {
      playNote({ midi: 76, duration: 0.06 });   // normal beat
    }

    setCurrentBeat(next);
  }, []);

  /* Re-create interval whenever isPlaying or selectedBPM changes */
  useEffect(() => {
    /* Clear any existing timer first */
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!isPlaying) {
      setCurrentBeat(-1);
      beatRef.current = -1;
      return;
    }

    const interval = Math.round(60000 / selectedBPM);
    timerRef.current = setInterval(tick, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, selectedBPM, tick]);

  const handleBpmSelect = (bpm: BpmValue) => {
    setSelectedBPM(bpm);
    /* If already playing, useEffect above will restart cleanly */
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentBeat(-1);
    beatRef.current = -1;
  };

  return (
    <div className="w-full bg-white rounded-3xl p-6 shadow-sm border border-border">

      {/* ── Transport controls ── */}
      <div className="flex gap-4 mb-5 justify-center">
        <Button
          size="icon"
          className="rounded-xl w-12 h-12"
          onClick={() => setIsPlaying((p) => !p)}
        >
          {isPlaying ? <Square className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="rounded-xl w-12 h-12"
          onClick={handleReset}
        >
          <RefreshCcw className="w-6 h-6" />
        </Button>
      </div>

      {/* ── BPM Selector ── */}
      <div className="flex flex-col items-center gap-2 mb-7">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Tempo (BPM)
        </span>
        <div className="flex gap-2">
          {BPM_OPTIONS.map((bpm) => {
            const active = bpm === selectedBPM;
            return (
              <motion.button
                key={bpm}
                onClick={() => handleBpmSelect(bpm)}
                whileTap={{ scale: 0.92 }}
                className={[
                  "px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-colors",
                  active
                    ? "bg-primary text-white border-primary shadow-md"
                    : "bg-muted text-muted-foreground border-transparent hover:border-primary/40",
                ].join(" ")}
              >
                {bpm}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Beat visualizer ── */}
      <div className="flex justify-between items-center px-2 sm:px-8">
        {PATTERN.map((beat, i) => {
          const active = currentBeat === i;
          const isAccent = active && i === 0;
          return (
            <div key={i} className="flex flex-col items-center gap-4">
              <motion.div
                className={[
                  "w-10 h-16 sm:w-14 sm:h-20 rounded-2xl flex items-center justify-center",
                  active
                    ? isAccent
                      ? "bg-accent text-white shadow-xl"
                      : "bg-primary text-white shadow-lg"
                    : "bg-muted text-muted-foreground",
                ].join(" ")}
                animate={
                  active
                    ? { scale: isAccent ? 1.18 : 1.1, y: beat.dir === "down" ? 10 : -10 }
                    : { scale: 1, y: 0 }
                }
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
              >
                <svg
                  className={`w-6 h-6 sm:w-8 sm:h-8 ${beat.dir === "down" ? "" : "rotate-180"}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </motion.div>
              <span className={`font-bold text-lg ${active ? "text-primary" : "text-muted-foreground"}`}>
                {beat.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
