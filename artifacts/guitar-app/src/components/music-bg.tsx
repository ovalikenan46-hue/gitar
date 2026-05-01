import { motion } from "framer-motion";
import { useMemo } from "react";

/* ══════════════════════════════════════════════════════
   SOL ANAHTARI (Treble / G Clef)
   Stroke-based: top curl → vertical spine → G-loop → bottom curl
═══════════════════════════════════════════════════════ */
export function TrebleClef(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 54 188"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* ─ Top spiral (clockwise, wrapping right then down-left) */}
      <path
        d="M27 44
           C 18 34, 12 20, 18 10
           C 24 0,  36 2,  40 12
           C 44 22, 40 34, 30 40"
        stroke="currentColor" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round"
      />

      {/* ─ Vertical spine (top of spiral → bottom curl) */}
      <line x1="27" y1="44" x2="25" y2="152"
        stroke="currentColor" strokeWidth="3.8" strokeLinecap="round"
      />

      {/* ─ G-loop (the defining oval/circle of the G-clef) */}
      <ellipse
        cx="27" cy="106" rx="20" ry="26"
        stroke="currentColor" strokeWidth="3.8"
      />

      {/* ─ Short connector from spine into the right side of G-loop */}
      <path
        d="M27 80 L40 90"
        stroke="currentColor" strokeWidth="3.8" strokeLinecap="round"
      />

      {/* ─ Bottom curl (tail below staff) */}
      <path
        d="M25 152
           C 25 164, 18 172, 10 168
           C 3  164, 3  154, 10 150"
        stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════
   FA ANAHTARI (Bass / F Clef)
   Backwards thick C + serif + two dots
═══════════════════════════════════════════════════════ */
export function BassClef(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 82 82"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* ─ Main backwards-C curve */}
      <path
        d="M46 6
           C 28 6,  8 18,  8 42
           C  8 66, 28 78, 46 78"
        stroke="currentColor" strokeWidth="8" strokeLinecap="round" fill="none"
      />

      {/* ─ Serif tick at top of C */}
      <path
        d="M30 8 C 22 4, 14 2, 10 10"
        stroke="currentColor" strokeWidth="5.5" strokeLinecap="round"
      />

      {/* ─ Two dots (defining feature of the F-clef) */}
      <circle cx="66" cy="26" r="7.5" fill="currentColor" />
      <circle cx="66" cy="50" r="7.5" fill="currentColor" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════
   LARGE FLOATING BACKGROUND SYMBOLS
   Symbols: ♩ ♪ ♫ ♬ ♭ ♯ ♮ — each 70-130 px
   4 distinct animation patterns: floatUp | sway | orbit | pulse
═══════════════════════════════════════════════════════ */
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
        size:     74 + Math.random() * 54,          // 74–128 px
        color:    COLORS[i % COLORS.length],
        variant:  VARIANTS[i % VARIANTS.length],
        duration: 5.5 + Math.random() * 6.5,        // 5.5–12 s
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
