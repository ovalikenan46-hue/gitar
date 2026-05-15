import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useAnimation } from "framer-motion";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─────────────────────────────────────────────────────────
   WEB AUDIO — Metronome click sounds
   Strong beat (beat 1): higher-pitched wooden click
   Normal beat: softer click
───────────────────────────────────────────────────────── */
let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    const Ctx = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function playClick(strong: boolean) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Strong beat: 1200 Hz, Normal: 800 Hz
    osc.frequency.setValueAtTime(strong ? 1200 : 800, ctx.currentTime);
    osc.type = "square";

    gain.gain.setValueAtTime(strong ? 0.55 : 0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  } catch {
    /* Ignore AudioContext errors on restrictive environments */
  }
}

/* ─────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────── */
const BPM_OPTIONS = [65, 80, 95, 115] as const;
type BpmValue = (typeof BPM_OPTIONS)[number];

const BPM_LABELS: Record<BpmValue, string> = {
  65:  "Yavaş",
  80:  "Orta",
  95:  "Hızlı",
  115: "Çok Hızlı",
};

interface MetronomeProps {
  onActivate?: () => void;
  onDeactivate?: () => void;
  isActive?: boolean;
}

export function Metronome({ onActivate, onDeactivate, isActive = true }: MetronomeProps) {
  const [isPlaying, setIsPlaying]     = useState(false);
  const [selectedBPM, setSelectedBPM] = useState<BpmValue>(80);
  const [beat, setBeat]               = useState(0);   // 0-3 (quarter notes, 4/4)
  const [side, setSide]               = useState<"left" | "right">("left");

  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const beatRef   = useRef(0);

  const pendulumControls = useAnimation();

  /* ── Pendulum swing ── */
  const swing = useCallback(async (toSide: "left" | "right") => {
    const x = toSide === "right" ? 32 : -32;
    await pendulumControls.start({
      rotate: toSide === "right" ? 18 : -18,
      transition: { type: "spring", stiffness: 280, damping: 18 },
    });
  }, [pendulumControls]);

  /* ── Tick callback ── */
  const tick = useCallback(() => {
    const nextBeat = (beatRef.current + 1) % 4;
    beatRef.current = nextBeat;
    setBeat(nextBeat);

    const isStrong = nextBeat === 0;
    playClick(isStrong);

    // Alternate pendulum direction each beat
    const nextSide = nextBeat % 2 === 0 ? "left" : "right";
    setSide(nextSide);
    void swing(nextSide);
  }, [swing]);

  /* ── Stop externally when parent deactivates (other player started) ── */
  useEffect(() => {
    if (!isActive) {
      setIsPlaying(false);
    }
  }, [isActive]);

  /* ── Timer management ── */
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!isPlaying) {
      setBeat(0);
      beatRef.current = 0;
      pendulumControls.start({ rotate: 0, transition: { type: "spring", stiffness: 120, damping: 14 } });
      return;
    }

    const interval = Math.round(60000 / selectedBPM);
    // Fire first tick immediately only when freshly starting
    tick();
    timerRef.current = setInterval(tick, interval);
    // Note: the immediate tick above gives instant audio feedback on "Başlat".

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, selectedBPM]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBpm = (bpm: BpmValue) => {
    setSelectedBPM(bpm);
    // If playing, the useEffect above will restart with new BPM
  };

  const togglePlay = () => {
    if (!isPlaying) {
      onActivate?.();    // starting → tell parent to stop the other one
    } else {
      onDeactivate?.();  // stopping → release the lock
    }
    setIsPlaying((p) => !p);
  };

  return (
    <div className="w-full bg-white rounded-3xl p-6 shadow-sm border border-border">

      {/* ── Header ── */}
      <div className="text-center mb-5">
        <h3 className="font-bold text-base text-foreground">Metronom</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Ritim çalışmana yardımcı ol</p>
      </div>

      {/* ── Pendulum visual ── */}
      <div className="flex justify-center items-end mb-6" style={{ height: 120 }}>
        <div className="relative flex flex-col items-center">
          {/* Pivot point */}
          <div className="w-4 h-4 rounded-full bg-primary/20 border-2 border-primary/50 z-10" />

          {/* Pendulum rod + bob */}
          <motion.div
            animate={pendulumControls}
            className="origin-top flex flex-col items-center"
            style={{ transformOrigin: "top center" }}
          >
            {/* Rod */}
            <div
              className="w-[3px] rounded-full"
              style={{
                height: 80,
                background: "linear-gradient(to bottom, #6C63FF, #00C2A8)",
              }}
            />
            {/* Bob — flashes on strong beat */}
            <motion.div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
              animate={{
                background:
                  beat === 0 && isPlaying
                    ? ["#FF6B6B", "#6C63FF", "#6C63FF"]
                    : "#6C63FF",
                scale: beat === 0 && isPlaying ? [1.3, 1] : 1,
              }}
              transition={{ duration: 0.18 }}
            >
              {beat === 0 ? "1" : beat + 1}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── BPM Selector ── */}
      <div className="flex flex-col items-center gap-3 mb-5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Tempo (BPM)
        </span>
        <div className="grid grid-cols-4 gap-2 w-full">
          {BPM_OPTIONS.map((bpm) => {
            const active = bpm === selectedBPM;
            return (
              <motion.button
                key={bpm}
                onClick={() => handleBpm(bpm)}
                whileTap={{ scale: 0.90 }}
                className={[
                  "flex flex-col items-center py-2 rounded-2xl border-2 transition-colors",
                  active
                    ? "bg-primary text-white border-primary shadow-md"
                    : "bg-muted/60 text-muted-foreground border-transparent hover:border-primary/30",
                ].join(" ")}
              >
                <span className="font-black text-lg leading-none">{bpm}</span>
                <span className={`text-[10px] mt-0.5 font-medium ${active ? "text-white/80" : "text-muted-foreground/60"}`}>
                  {BPM_LABELS[bpm]}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Beat indicator dots ── */}
      <div className="flex justify-center gap-3 mb-5">
        {[0, 1, 2, 3].map((b) => (
          <motion.div
            key={b}
            className="rounded-full"
            animate={{
              width:      isPlaying && beat === b ? 20 : 12,
              height:     12,
              background: isPlaying && beat === b
                ? b === 0 ? "#FF6B6B" : "#6C63FF"
                : "#e5e7eb",
            }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          />
        ))}
      </div>

      {/* ── Play / Stop ── */}
      <div className="flex justify-center">
        <Button
          size="lg"
          className="rounded-2xl px-10 h-12 font-bold text-base"
          onClick={togglePlay}
        >
          {isPlaying
            ? <><Square className="w-5 h-5 mr-2" /> Durdur</>
            : <><Play  className="w-5 h-5 mr-2 ml-1" /> Başlat</>}
        </Button>
      </div>
    </div>
  );
}
