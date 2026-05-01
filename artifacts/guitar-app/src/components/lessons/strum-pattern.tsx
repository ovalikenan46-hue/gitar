import { useState, useEffect } from "react";
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

export function StrumPattern() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);

  useEffect(() => {
    if (!isPlaying) {
      setCurrentBeat(-1);
      return;
    }

    // ~80 BPM — 8th notes, 600 ms per step
    const interval = setInterval(() => {
      setCurrentBeat((prev) => {
        const next = (prev + 1) % PATTERN.length;
        playNote({ midi: 76, duration: 0.1 });
        return next;
      });
    }, 600);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="w-full bg-white rounded-3xl p-6 shadow-sm border border-border">
      <div className="flex gap-4 mb-8 justify-center">
        <Button
          size="icon"
          className="rounded-xl w-12 h-12"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Square className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="rounded-xl w-12 h-12"
          onClick={() => { setIsPlaying(false); setCurrentBeat(-1); }}
        >
          <RefreshCcw className="w-6 h-6" />
        </Button>
      </div>

      <div className="flex justify-between items-center px-2 sm:px-8">
        {PATTERN.map((beat, i) => (
          <div key={i} className="flex flex-col items-center gap-4">
            <motion.div
              className={`w-10 h-16 sm:w-14 sm:h-20 rounded-2xl flex items-center justify-center ${currentBeat === i ? "bg-primary text-white shadow-lg" : "bg-muted text-muted-foreground"}`}
              animate={currentBeat === i ? { scale: 1.1, y: beat.dir === "down" ? 10 : -10 } : { scale: 1, y: 0 }}
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
            <span className={`font-bold text-lg ${currentBeat === i ? "text-primary" : "text-muted-foreground"}`}>
              {beat.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
