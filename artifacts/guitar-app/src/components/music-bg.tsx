import { motion } from "framer-motion";
import { useMemo } from "react";

/* ══════════════════════════════════════════════════════════════
   SOL ANAHTARI — Unicode G-clef character (𝄞 U+1D11E)
   Rendered via SVG <text> so it always looks 100% correct in
   every modern browser (Chrome / Firefox / Safari / Edge).
   Inherits "currentColor" for easy color control.
══════════════════════════════════════════════════════════════ */
export function TrebleClef(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="1 -10 44 140"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      {...props}
    >
      <text
        x="0"
        y="120"
        fontSize="130"
        fontFamily="'Times New Roman', 'Georgia', 'FreeSerif', 'Noto Serif', serif"
        fill="currentColor"
        dominantBaseline="auto"
        textAnchor="start"
      >
        𝄞
      </text>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════
   FA ANAHTARI — Unicode F-clef character (𝄢 U+1D122)
   Same approach: SVG <text> with serif font renders the true
   bass-clef glyph including its two dots.
══════════════════════════════════════════════════════════════ */
export function BassClef(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="-2 30 70 85"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      {...props}
    >
      <text
        x="0"
        y="115"
        fontSize="120"
        fontFamily="'Times New Roman', 'Georgia', 'FreeSerif', 'Noto Serif', serif"
        fill="currentColor"
        dominantBaseline="auto"
        textAnchor="start"
      >
        𝄢
      </text>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════
   LARGE FLOATING BACKGROUND SYMBOLS  (74 – 128 px)
   Symbols: ♩ ♪ ♫ ♬ ♭ ♯ ♮
   4 distinct animation patterns per symbol
══════════════════════════════════════════════════════════════ */
const SYMBOLS = ["♩", "♪", "♫", "♬", "♭", "♯", "♮"];

const COLORS = [
  "rgba(108,99,255,0.20)",
  "rgba(255,140,0,0.22)",
  "rgba(0,194,168,0.20)",
  "rgba(76,175,80,0.22)",
  "rgba(255,107,138,0.18)",
  "rgba(66,153,225,0.22)",
  "rgba(255,184,108,0.20)",
];

type Variant = "floatUp" | "sway" | "orbit" | "pulse";
const VARIANTS: Variant[] = ["floatUp", "sway", "orbit", "pulse"];

function makeAnim(v: Variant, drift: number, rot: number) {
  switch (v) {
    case "floatUp": return {
      y:       [0, -50, -8, -50, 0],
      x:       [0, drift * 0.4, -drift * 0.2, drift * 0.4, 0],
      rotate:  [0, rot * 0.5, -rot * 0.3, rot * 0.5, 0],
      opacity: [0.55, 1, 0.75, 1, 0.55],
    };
    case "sway": return {
      x:       [-drift, drift, -drift * 0.5, drift, -drift],
      y:       [0, -18, 0, -18, 0],
      rotate:  [-rot, rot, -rot * 0.5, rot, -rot],
      opacity: [0.45, 0.95, 0.60, 0.95, 0.45],
    };
    case "orbit": return {
      x:       [0, drift, drift * 0.3, -drift * 0.7, 0],
      y:       [0, -22, -44, -22, 0],
      rotate:  [0, rot, rot * 0.4, -rot * 0.6, 0],
      scale:   [1, 1.14, 1.04, 0.90, 1],
      opacity: [0.50, 0.95, 0.65, 0.90, 0.50],
    };
    case "pulse": return {
      scale:   [1, 1.28, 0.92, 1.18, 1],
      rotate:  [0, rot * 0.4, -rot * 0.3, rot * 0.2, 0],
      opacity: [0.40, 0.92, 0.50, 0.88, 0.40],
      y:       [0, -14, 4, -10, 0],
    };
  }
}

interface Sym {
  glyph: string;
  left: number;
  top: number;
  size: number;
  color: string;
  variant: Variant;
  duration: number;
  delay: number;
  drift: number;
  rot: number;
}

export function MusicBg({ count = 18 }: { count?: number }) {
  const items = useMemo<Sym[]>(() => {
    const arr: Sym[] = [];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 6);
      const col = i % 6;
      arr.push({
        glyph:    SYMBOLS[i % SYMBOLS.length],
        left:     5 + col * 16 + (Math.random() - 0.5) * 9,
        top:      6 + row * 30 + (Math.random() - 0.5) * 12,
        size:     74 + Math.random() * 54,
        color:    COLORS[i % COLORS.length],
        variant:  VARIANTS[i % VARIANTS.length],
        duration: 5.5 + Math.random() * 6.5,
        delay:    Math.random() * 6,
        drift:    20 + Math.random() * 32,
        rot:      10 + Math.random() * 20,
      });
    }
    return arr;
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
      {items.map((s, i) => (
        <motion.span
          key={i}
          className="absolute select-none font-bold leading-none"
          style={{ left: `${s.left}%`, top: `${s.top}%`, fontSize: s.size, color: s.color }}
          animate={makeAnim(s.variant, s.drift, s.rot)}
          transition={{
            duration: s.duration,
            delay:    s.delay,
            repeat:   Infinity,
            ease:     "easeInOut",
            times:    [0, 0.25, 0.5, 0.75, 1],
          }}
        >
          {s.glyph}
        </motion.span>
      ))}
    </div>
  );
}
