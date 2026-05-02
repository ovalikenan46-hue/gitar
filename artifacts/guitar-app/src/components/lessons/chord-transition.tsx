import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";

interface TransitionFinger {
  num: number;
  fromStr: number;
  fromFret: number;
  toStr: number;
  toFret: number;
  action: "move" | "stay" | "add";
  tip: string;
}

interface TransitionDef {
  title: string;
  fromName: string;
  toName: string;
  fromAudio: string;
  toAudio: string;
  fingers: TransitionFinger[];
  steps: string[];
}

const TRANSITIONS: Record<string, TransitionDef> = {
  "3A": {
    title: "Em → Am Geçişi",
    fromName: "Em",
    toName: "Am",
    fromAudio: "em-chord.mp4",
    toAudio: "am-chord.mp4",
    fingers: [
      { num: 3, fromStr: 3, fromFret: 2, toStr: 2, toFret: 2, action: "move", tip: "Yüzük (3): D telinden G teline kaydır" },
      { num: 2, fromStr: 4, fromFret: 2, toStr: 3, toFret: 2, action: "move", tip: "Orta (2): A telinden D teline kaydır" },
      { num: 1, fromStr: -1, fromFret: -1, toStr: 1, toFret: 1, action: "add", tip: "İşaret (1): B teli, 1. perdeye yerleştir" },
    ],
    steps: [
      "Em hazır — parmaklar A ve D tellerinde",
      "Yüzük parmağını (3) D telinden G teline kaydır",
      "Orta parmağını (2) A telinden D teline kaydır",
      "İşaret parmağını (1) B teline 1. perdeye ekle — Am hazır! 🎸",
    ],
  },
  "3B": {
    title: "Am → C Geçişi",
    fromName: "Am",
    toName: "C",
    fromAudio: "am-chord.mp4",
    toAudio: "chords/C.mp4",
    fingers: [
      { num: 1, fromStr: 1, fromFret: 1, toStr: 1, toFret: 1, action: "stay", tip: "İşaret (1) aynı yerde kalıyor ✓" },
      { num: 2, fromStr: 3, fromFret: 2, toStr: 3, toFret: 2, action: "stay", tip: "Orta (2) aynı yerde kalıyor ✓" },
      { num: 3, fromStr: 2, fromFret: 2, toStr: 4, toFret: 3, action: "move", tip: "Yüzük (3): G teli 2. perdeden → A teli 3. perdeye taşı" },
    ],
    steps: [
      "Am hazır — İşaret ve orta parmak yerinde kalacak",
      "Yüzük parmağını (3) G telinden A teline, 3. perdeye taşı — C hazır! 🎸",
    ],
  },
  "3C": {
    title: "C → D Geçişi",
    fromName: "C",
    toName: "D",
    fromAudio: "chords/C.mp4",
    toAudio: "chords/D.mp4",
    fingers: [
      { num: 2, fromStr: 3, fromFret: 2, toStr: 0, toFret: 2, action: "move", tip: "Önce orta (2): D telinden e (ince) teline taşı" },
      { num: 1, fromStr: 1, fromFret: 1, toStr: 2, toFret: 2, action: "move", tip: "İşaret (1): B telinden G teline, 2. perdeye taşı" },
      { num: 3, fromStr: 4, fromFret: 3, toStr: 1, toFret: 3, action: "move", tip: "Yüzük (3): A telinden B teline taşı — perde aynı" },
    ],
    steps: [
      "C hazır — 3 parmağın da taşınması gerekiyor",
      "Önce orta parmağı (2) D telinden e (ince) teline taşı",
      "İşaret parmağını (1) B telinden G teline, 2. perdeye taşı",
      "Yüzük parmağını (3) A telinden B teline taşı — D hazır! 🎸",
    ],
  },
};

const FINGER_COLORS: Record<number, string> = {
  1: "#22C55E",
  2: "#3B82F6",
  3: "#F97316",
};

const STRINGS = [
  { label: "E", thickness: 3.2 },
  { label: "A", thickness: 2.6 },
  { label: "D", thickness: 2.1 },
  { label: "G", thickness: 1.6 },
  { label: "B", thickness: 1.2 },
  { label: "e", thickness: 0.9 },
];

function stringToYPercent(s: number) {
  return ((5 - s + 0.5) / 6) * 100;
}
function fretToXPercent(f: number) {
  return ((f - 0.5) / 4) * 100;
}

export function ChordTransition({ transitionCode }: { transitionCode: "3A" | "3B" | "3C" }) {
  const def = TRANSITIONS[transitionCode];
  const movableFingers = def.fingers.filter((f) => f.action !== "stay");
  const totalSteps = movableFingers.length;
  const [step, setStep] = useState(0);
  const isComplete = step === totalSteps;

  function getPos(f: TransitionFinger) {
    if (f.action === "stay") return { visible: true, str: f.toStr, fret: f.toFret };
    const mIdx = movableFingers.indexOf(f);
    const moveStep = mIdx + 1;
    if (f.action === "add") {
      if (step < moveStep) return { visible: false, str: f.toStr, fret: f.toFret };
      return { visible: true, str: f.toStr, fret: f.toFret };
    }
    if (step < moveStep) return { visible: true, str: f.fromStr, fret: f.fromFret };
    return { visible: true, str: f.toStr, fret: f.toFret };
  }

  const activeMovable = step > 0 && step <= totalSteps ? movableFingers[step - 1] : null;

  const playAudio = (file: string) => {
    const audio = new Audio(`${import.meta.env.BASE_URL}sounds/${file}`);
    audio.play().catch(() => {});
  };

  return (
    <div className="w-full flex flex-col items-center gap-5 bg-white rounded-[2rem] p-5 shadow-sm">
      <h3 className="text-2xl font-bold text-gray-800">{def.title}</h3>

      <div className="flex flex-row items-start gap-5 w-full">
        <div className="flex-shrink-0 w-40 flex flex-col gap-3">
          <div className="bg-primary/5 rounded-2xl p-3">
            <p className="font-bold text-primary text-[10px] uppercase tracking-wider mb-1">
              Adım {step} / {totalSteps}
            </p>
            <p className="text-foreground text-xs leading-relaxed">{def.steps[step]}</p>
          </div>

          <AnimatePresence mode="wait">
            {activeMovable && (
              <motion.div
                key={`tip-${step}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="bg-secondary/10 rounded-xl p-2 text-xs leading-relaxed"
              >
                <span
                  className="inline-flex w-4 h-4 rounded-full text-white font-bold items-center justify-center mr-1 flex-shrink-0"
                  style={{ fontSize: 8, background: FINGER_COLORS[activeMovable.num] }}
                >
                  {activeMovable.num}
                </span>
                {activeMovable.tip}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-1">
            {([1, 2, 3] as const).map((n) => (
              <span key={n} className="flex items-center gap-1 text-[10px] font-medium" style={{ color: FINGER_COLORS[n] }}>
                <span
                  className="inline-flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
                  style={{ width: 14, height: 14, fontSize: 8, background: FINGER_COLORS[n] }}
                >
                  {n}
                </span>
                {n === 1 ? "İşaret" : n === 2 ? "Orta" : "Yüzük"}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider self-center">
            Perde Diyagramı
          </span>

          <div className="flex ml-7">
            {[1, 2, 3, 4].map((f) => (
              <div key={f} className="flex-1 text-center text-[10px] font-semibold text-gray-400">
                {f}. Perde
              </div>
            ))}
          </div>

          <div className="flex items-stretch gap-0">
            <div className="flex flex-col justify-around pr-1.5" style={{ width: 26 }}>
              {STRINGS.map(({ label }) => (
                <span key={label} className="text-[10px] font-bold text-gray-500 text-right leading-none">
                  {label}
                </span>
              ))}
            </div>

            <div
              className="relative flex-1 bg-[#3E2723] rounded-r-sm border-[3px] border-[#2E1A17]"
              style={{ height: 168, borderLeftWidth: 14, borderLeftColor: "#F5F5F5" }}
            >
              <div className="absolute inset-0 flex">
                {[1, 2, 3].map((f) => (
                  <div key={f} className="flex-1 border-r-[2px] border-[#BDBDBD]" />
                ))}
                <div className="flex-1" />
              </div>

              {STRINGS.map(({ label, thickness }, idx) => {
                const yPct = ((idx + 0.5) / 6) * 100;
                return (
                  <div
                    key={label}
                    className="absolute left-0 right-0 bg-slate-300"
                    style={{ top: `${yPct}%`, height: thickness, transform: "translateY(-50%)" }}
                  />
                );
              })}

              {activeMovable && activeMovable.action !== "add" && (() => {
                const mIdx = movableFingers.indexOf(activeMovable);
                const moveStep = mIdx + 1;
                if (step !== moveStep) return null;
                const x1 = fretToXPercent(activeMovable.fromFret);
                const y1 = stringToYPercent(activeMovable.fromStr);
                const x2 = fretToXPercent(activeMovable.toFret);
                const y2 = stringToYPercent(activeMovable.toStr);
                return (
                  <svg
                    className="absolute inset-0 w-full h-full z-20 pointer-events-none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <marker id={`arr-${transitionCode}`} markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto" markerUnits="strokeWidth">
                        <polygon points="0 0, 5 2.5, 0 5" fill="rgba(255,255,255,0.85)" />
                      </marker>
                    </defs>
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="rgba(255,255,255,0.7)"
                      strokeWidth="2"
                      strokeDasharray="5 3"
                      markerEnd={`url(#arr-${transitionCode})`}
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                );
              })()}

              <AnimatePresence>
                {def.fingers.map((f) => {
                  const pos = getPos(f);
                  if (!pos.visible) return null;
                  const xPct = fretToXPercent(pos.fret);
                  const yPct = stringToYPercent(pos.str);
                  const color = FINGER_COLORS[f.num];
                  const isActive = activeMovable?.num === f.num;
                  return (
                    <motion.div
                      key={`wrap-${f.num}`}
                      className="absolute"
                      animate={{ left: `${xPct}%`, top: `${yPct}%` }}
                      initial={f.action === "add" ? { left: `${xPct}%`, top: `${yPct}%` } : false}
                      transition={{ type: "spring", stiffness: 180, damping: 22 }}
                    >
                      <motion.div
                        className="w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-lg z-10 relative"
                        initial={f.action === "add" ? { scale: 0, opacity: 0 } : false}
                        animate={{ scale: isActive ? 1.25 : 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        style={{ background: color, boxShadow: isActive ? `0 2px 18px ${color}bb` : `0 2px 10px ${color}88` }}
                      >
                        {f.num}
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 rounded-full border-2 border-white/70"
                            animate={{ scale: [1, 1.55, 1], opacity: [0.8, 0, 0.8] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                          />
                        )}
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full justify-center flex-wrap">
        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => playAudio(def.fromAudio)}>
          <Play className="w-4 h-4 mr-1 fill-current" /> {def.fromName} Çal
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline" size="icon" className="rounded-xl"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="icon" className="rounded-xl"
            onClick={() => setStep(Math.min(totalSteps, step + 1))}
            disabled={isComplete}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {isComplete ? (
          <Button
            size="sm" className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => playAudio(def.toAudio)}
          >
            <Play className="w-4 h-4 mr-1 fill-current" /> {def.toName} Çal
          </Button>
        ) : (
          <Button
            variant="ghost" size="sm" className="rounded-xl text-muted-foreground"
            onClick={() => setStep(0)}
          >
            <RotateCcw className="w-4 h-4 mr-1" /> Başa Dön
          </Button>
        )}
      </div>

      <div className="flex gap-1.5 items-center">
        {Array.from({ length: totalSteps + 1 }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/40" : "w-3 bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
