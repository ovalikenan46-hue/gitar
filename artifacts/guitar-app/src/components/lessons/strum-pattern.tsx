import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, Square, RefreshCcw } from "lucide-react";
import { playNote } from "@/lib/audio";
import { chordImages } from "@/utils/chordImages";

const PATTERN = [
  { dir: "down", count: "1" },
  { dir: "down", count: "2" },
  { dir: "up",   count: "3" },
  { dir: "up",   count: "4" },
  { dir: "down", count: "1" },
  { dir: "up",   count: "2" },
];

interface StrumPatternProps {
  onActivate?: () => void;
  onDeactivate?: () => void;
  isActive?: boolean;
}

export function StrumPattern({ onActivate, onDeactivate, isActive = true }: StrumPatternProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);

  /* If parent deactivates us (other player started), stop immediately */
  useEffect(() => {
    if (!isActive) {
      setIsPlaying(false);
      setCurrentBeat(-1);
    }
  }, [isActive]);

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

  const handlePlay = () => {
    if (!isPlaying) {
      onActivate?.();      // starting → tell parent to stop the other one
    } else {
      onDeactivate?.();    // stopping → release the lock so other one can start
    }
    setIsPlaying((p) => !p);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentBeat(-1);
    onDeactivate?.();      // manual reset → release the lock
  };

  return (
    <div className="w-full bg-white rounded-3xl p-6 shadow-sm border border-border">

      {/* Ritim görseli */}
      <div className="mb-6 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <img
          src={chordImages.ritim}
          alt="Ritim Kalıbı — 2 Aşağı, 2 Yukarı, 1 Aşağı, 1 Yukarı"
          draggable={false}
          className="w-full object-contain"
          style={{ maxHeight: 180 }}
        />
      </div>

      <div className="flex gap-4 mb-8 justify-center">
        <Button
          size="icon"
          className="rounded-xl w-12 h-12"
          onClick={handlePlay}
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
