import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import { chordImages } from "@/utils/chordImages";

interface TransitionFinger {
  num: number;
  action: "move" | "stay" | "add";
  tip: string;
}

interface TransitionDef {
  title: string;
  fromCode: string;
  toCode: string;
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
    fromCode: "Em",
    toCode: "Am",
    fromName: "Em",
    toName: "Am",
    fromAudio: "em-chord.mp4",
    toAudio: "am-chord.mp4",
    fingers: [
      { num: 3, action: "move", tip: "Yüzük (3): D telinden G teline kaydır" },
      { num: 2, action: "move", tip: "Orta (2): A telinden D teline kaydır" },
      { num: 1, action: "add",  tip: "İşaret (1): B teli, 1. perdeye yerleştir" },
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
    fromCode: "Am",
    toCode: "C",
    fromName: "Am",
    toName: "C",
    fromAudio: "am-chord.mp4",
    toAudio: "chords/C.mp4",
    fingers: [
      { num: 3, action: "move", tip: "Yüzük (3): G teli 2. perdeden → A teli 3. perdeye taşı" },
    ],
    steps: [
      "Am hazır — İşaret ve orta parmak yerinde kalacak",
      "Yüzük parmağını (3) G telinden A teline, 3. perdeye taşı — C hazır! 🎸",
    ],
  },
  "3C": {
    title: "C → D Geçişi",
    fromCode: "C",
    toCode: "D",
    fromName: "C",
    toName: "D",
    fromAudio: "chords/C.mp4",
    toAudio: "chords/D.mp4",
    fingers: [
      { num: 2, action: "move", tip: "Önce orta (2): D telinden e (ince) teline taşı" },
      { num: 1, action: "move", tip: "İşaret (1): B telinden G teline, 2. perdeye taşı" },
      { num: 3, action: "move", tip: "Yüzük (3): A telinden B teline taşı — perde aynı" },
    ],
    steps: [
      "C hazır — 3 parmağın da taşınması gerekiyor",
      "Önce orta parmağı (2) D telinden e (ince) teline taşı",
      "İşaret parmağını (1) B telinden G teline, 2. perdeye taşı",
      "Yüzük parmağını (3) A telinden B teline taşı — D hazır! 🎸",
    ],
  },
};

const FINGER_COLORS: Record<number, string> = { 1: "#22C55E", 2: "#3B82F6", 3: "#F97316" };

export function ChordTransition({ transitionCode }: { transitionCode: "3A" | "3B" | "3C" }) {
  const def = TRANSITIONS[transitionCode];
  const totalSteps = def.fingers.length;
  const [step, setStep] = useState(0);
  const isComplete = step === totalSteps;

  const activeFinger = step > 0 && step <= totalSteps ? def.fingers[step - 1] : null;

  const playAudio = (file: string) => {
    const audio = new Audio(`${import.meta.env.BASE_URL}sounds/${file}`);
    audio.play().catch(() => {});
  };

  const fromImg = chordImages[def.fromCode] ?? null;
  const toImg = chordImages[def.toCode] ?? null;

  return (
    <div className="w-full flex flex-col items-center gap-5 bg-white rounded-[2rem] p-5 shadow-sm">
      <h3 className="text-2xl font-bold text-gray-800">{def.title}</h3>

      {/* ── Chord images: from ⟶ to ─────────────────────────────────────── */}
      <div className="flex items-center gap-4 w-full justify-center">

        {/* From chord image */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Başlangıç</span>
          <motion.div
            animate={{ opacity: isComplete ? 0.35 : 1, scale: isComplete ? 0.95 : 1 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl overflow-hidden border-2 bg-gray-900 shadow-md"
            style={{ borderColor: isComplete ? "#e5e7eb" : "#6C63FF", width: 130, height: 162 }}
          >
            {fromImg ? (
              <img src={fromImg} alt={def.fromName} draggable={false} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs p-2 text-center">
                Akor görseli yüklenmedi
              </div>
            )}
          </motion.div>
          <span className="font-bold text-lg text-primary">{def.fromName}</span>
        </div>

        {/* Arrow + step area */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <div className="flex flex-col items-center gap-1">
            <svg width="44" height="20" viewBox="0 0 44 20" fill="none">
              <path d="M2 10 H38 M30 3 L42 10 L30 17" stroke="#6C63FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[10px] text-gray-400 font-semibold">{step}/{totalSteps} adım</span>
          </div>
        </div>

        {/* To chord image */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Hedef</span>
          <motion.div
            animate={{ opacity: isComplete ? 1 : 0.4, scale: isComplete ? 1.03 : 1 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl overflow-hidden border-2 bg-gray-900 shadow-md"
            style={{ borderColor: isComplete ? "#00C2A8" : "#e5e7eb", width: 130, height: 162 }}
          >
            {toImg ? (
              <img src={toImg} alt={def.toName} draggable={false} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs p-2 text-center">
                Akor görseli yüklenmedi
              </div>
            )}
          </motion.div>
          <span className="font-bold text-lg" style={{ color: isComplete ? "#00C2A8" : "#9ca3af" }}>{def.toName}</span>
        </div>
      </div>

      {/* ── Step description ─────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          className="w-full bg-primary/5 rounded-2xl p-4 text-center"
        >
          <p className="font-bold text-primary text-[10px] uppercase tracking-wider mb-1">
            Adım {step} / {totalSteps}
          </p>
          <p className="text-sm text-foreground leading-relaxed">{def.steps[step]}</p>

          {activeFinger && (
            <div className="mt-3 inline-flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ fontSize: 11, background: FINGER_COLORS[activeFinger.num] }}
              >
                {activeFinger.num}
              </span>
              <span className="text-xs text-gray-700">{activeFinger.tip}</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 w-full justify-center flex-wrap">
        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => playAudio(def.fromAudio)}>
          <Play className="w-4 h-4 mr-1 fill-current" /> {def.fromName} Çal
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="rounded-xl"
            onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="icon" className="rounded-xl"
            onClick={() => setStep(Math.min(totalSteps, step + 1))} disabled={isComplete}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {isComplete ? (
          <Button size="sm" className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => playAudio(def.toAudio)}>
            <Play className="w-4 h-4 mr-1 fill-current" /> {def.toName} Çal
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground" onClick={() => setStep(0)}>
            <RotateCcw className="w-4 h-4 mr-1" /> Başa Dön
          </Button>
        )}
      </div>

      {/* ── Progress dots ────────────────────────────────────────────────── */}
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
