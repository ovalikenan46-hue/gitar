import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChordTransition, TransitionCode } from "@/components/lessons/chord-transition";

type SectionCode = "6A" | "6B" | "6C" | "6D";

const SECTION_TRANSITIONS: Record<SectionCode, TransitionCode[]> = {
  "6A": ["6A1", "6A2", "6A3"],
  "6B": ["6B1", "6B2"],
  "6C": ["6C1", "6C2"],
  "6D": ["6D1", "6D2", "6D3"],
};

const SECTION_LABELS: Record<SectionCode, string[]> = {
  "6A": ["Em → E", "E → Am", "Am → A"],
  "6B": ["Dm → C", "C → G"],
  "6C": ["C → F", "F → Em"],
  "6D": ["Em → B7", "B7 → C", "C → D"],
};

interface ChordTransitionSectionProps {
  sectionCode: SectionCode;
}

export function ChordTransitionSection({ sectionCode }: ChordTransitionSectionProps) {
  const transitions = SECTION_TRANSITIONS[sectionCode];
  const labels = SECTION_LABELS[sectionCode];
  const [current, setCurrent] = useState(0);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Transition tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 justify-center">
        {transitions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={[
              "flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              i === current
                ? "bg-primary text-white shadow-sm scale-105"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            ].join(" ")}
          >
            {labels[i]}
          </button>
        ))}
      </div>

      {/* Section progress indicator */}
      <div className="flex items-center gap-1.5 justify-center">
        {transitions.map((_, i) => (
          <div
            key={i}
            onClick={() => setCurrent(i)}
            className={[
              "h-1.5 rounded-full cursor-pointer transition-all duration-300",
              i === current ? "w-8 bg-primary" : "w-3 bg-muted hover:bg-muted-foreground/30",
            ].join(" ")}
          />
        ))}
      </div>

      {/* Active transition — remounts on change to reset internal step state */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${sectionCode}-${current}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.22 }}
        >
          <ChordTransition transitionCode={transitions[current]} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
