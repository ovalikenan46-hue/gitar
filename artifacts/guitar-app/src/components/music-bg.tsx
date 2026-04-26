import { motion } from "framer-motion";
import { useMemo } from "react";

const NOTE_GLYPHS = ["\u2669", "\u266A", "\u266B", "\u266C", "\u2671"];

interface FloatingNote {
  glyph: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  color: string;
}

const COLORS = ["text-primary/40", "text-secondary/50", "text-accent/40"];

export function MusicBg({ count = 14 }: { count?: number }) {
  const notes = useMemo<FloatingNote[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      glyph: NOTE_GLYPHS[i % NOTE_GLYPHS.length],
      left: Math.random() * 100,
      size: 18 + Math.random() * 28,
      duration: 12 + Math.random() * 14,
      delay: Math.random() * 14,
      drift: (Math.random() - 0.5) * 80,
      color: COLORS[i % COLORS.length],
    }));
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {notes.map((note, i) => (
        <motion.span
          key={i}
          className={`absolute select-none font-bold ${note.color}`}
          style={{
            left: `${note.left}%`,
            bottom: -40,
            fontSize: note.size,
          }}
          initial={{ y: 0, x: 0, opacity: 0, rotate: -10 }}
          animate={{
            y: -800,
            x: [0, note.drift, -note.drift, 0],
            opacity: [0, 0.9, 0.9, 0],
            rotate: [-10, 10, -10],
          }}
          transition={{
            duration: note.duration,
            delay: note.delay,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.15, 0.85, 1],
          }}
        >
          {note.glyph}
        </motion.span>
      ))}
    </div>
  );
}

export function TrebleClef(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 240" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M50.5 8c-9 6-14 17-14 28 0 9 4 17 10 24-9 9-16 19-16 32 0 14 11 24 24 24 4 0 7 0 10-1l3 22c1 9-5 15-13 15-4 0-7-1-9-3 4 0 8-3 8-8 0-5-4-8-9-8-6 0-10 5-10 10 0 9 9 15 19 15 12 0 22-8 21-21l-3-23c12-3 20-13 20-25 0-12-9-22-21-22-2 0-4 0-6 1l-2-15c10-9 17-19 17-31 0-9-7-17-16-17h-1zm0 8c4 0 7 4 7 9 0 8-5 16-12 22l-2-12c-1-9 2-16 7-19zm-3 39l3 18c-7 1-12 7-12 14 0 6 4 11 10 13-1 1-3 1-5 1-9 0-16-7-16-16 0-12 8-22 20-30zm12 36c8 0 14 7 14 16 0 8-5 15-13 17l-4-29c1-2 2-4 3-4z"/>
    </svg>
  );
}

export function BassClef(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 120" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M22 22c0-3 2-5 5-5 28 0 51 22 51 51 0 17-9 31-22 38-2 1-4-1-3-3 11-7 18-20 18-35 0-23-19-41-42-41-2 0-4 1-5 2 7 1 12 7 12 14 0 8-7 15-15 15s-15-7-15-15c0-12 8-21 16-21zm6 8c-5 0-9 5-9 12 0 5 4 9 9 9s9-4 9-9-4-12-9-12z"/>
      <circle cx="86" cy="32" r="6"/>
      <circle cx="86" cy="50" r="6"/>
    </svg>
  );
}
